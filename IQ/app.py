from datetime import datetime, timedelta
import os

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)

# -------------------------------------------------
# App & extensions
# -------------------------------------------------

# Serve frontend from the project root, like in the 5000-fix version
app = Flask(__name__, static_folder=".", static_url_path="")

app.config["SECRET_KEY"] = "super-secret-change-me"
app.config["JWT_SECRET_KEY"] = "super-secret-jwt-change-me"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///iq.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)


# -------------------------------------------------
# Serve index.html
# -------------------------------------------------

@app.route("/")
def index():
    return app.send_static_file("index.html")


# -------------------------------------------------
# Database models
# -------------------------------------------------

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    scores = db.relationship("Score", backref="user", lazy=True)

    # relationship to custom quizzes (defined below)
    custom_quizzes = db.relationship(
        "CustomQuiz",
        backref="owner",
        lazy=True,
        cascade="all, delete-orphan"
    )

    # old per-question builder (you can ignore this in the UI if you want)
    questions = db.relationship("Question", backref="creator", lazy=True)

    def to_dict_basic(self):
        return {
            "id": self.id,
            "username": self.username,
            "created_at": self.created_at.isoformat(),
        }


class Question(db.Model):
    """
    Old generic questions table we used for 'My Questions'.
    You can stop using this in the UI if you prefer quizzes only.
    """

    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.String(64), nullable=False)
    subcategory_id = db.Column(db.String(64), nullable=True)
    question_text = db.Column(db.String(512), nullable=False)

    option_a = db.Column(db.String(256), nullable=False)
    option_b = db.Column(db.String(256), nullable=False)
    option_c = db.Column(db.String(256), nullable=False)
    option_d = db.Column(db.String(256), nullable=False)
    correct_index = db.Column(db.Integer, nullable=False)  # 0..3

    difficulty = db.Column(db.String(16), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "category_id": self.category_id,
            "subcategory_id": self.subcategory_id,
            "question": self.question_text,
            "options": [
                self.option_a,
                self.option_b,
                self.option_c,
                self.option_d,
            ],
            "answerIndex": self.correct_index,
            "difficulty": self.difficulty,
            "createdBy": self.creator.username if self.creator else None,
            "created_at": self.created_at.isoformat(),
        }


class Score(db.Model):
    __tablename__ = "scores"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    category_id = db.Column(db.String(64), nullable=False)
    subcategory_id = db.Column(db.String(64), nullable=True)
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user": self.user.username if self.user else None,
            "category_id": self.category_id,
            "subcategory_id": self.subcategory_id,
            "score": self.score,
            "total_questions": self.total_questions,
            "created_at": self.created_at.isoformat(),
        }


# ---------- NEW: user-made quizzes + their questions ----------

class CustomQuiz(db.Model):
    """
    A quiz created by a user. Each quiz has many quiz-questions.
    """

    __tablename__ = "custom_quizzes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    title = db.Column(db.String(128), nullable=False)
    description = db.Column(db.String(512))
    theme = db.Column(db.String(32))  # e.g. "space", "neon" if you want later

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship(
        "CustomQuizQuestion",
        backref="quiz",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="CustomQuizQuestion.created_at.asc()",
    )

    def to_dict(self, include_questions: bool = False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "theme": self.theme,
            "created_at": self.created_at.isoformat(),
        }
        if include_questions:
            data["questions"] = [q.to_dict() for q in self.questions]
        return data


class CustomQuizQuestion(db.Model):
    """
    A question belonging to a specific CustomQuiz.
    """

    __tablename__ = "custom_quiz_questions"

    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey("custom_quizzes.id"), nullable=False)

    question_text = db.Column(db.String(512), nullable=False)
    option_a = db.Column(db.String(256), nullable=False)
    option_b = db.Column(db.String(256), nullable=False)
    option_c = db.Column(db.String(256), nullable=False)
    option_d = db.Column(db.String(256), nullable=False)
    correct_index = db.Column(db.Integer, nullable=False)  # 0..3

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "quiz_id": self.quiz_id,
            "question": self.question_text,
            "options": [
                self.option_a,
                self.option_b,
                self.option_c,
                self.option_d,
            ],
            "answerIndex": self.correct_index,
            "created_at": self.created_at.isoformat(),
        }


# -------------------------------------------------
# Ensure tables exist
# -------------------------------------------------

with app.app_context():
    db.create_all()


# -------------------------------------------------
# Helper
# -------------------------------------------------

def verify_password(user: User, plain_password: str) -> bool:
    return bcrypt.check_password_hash(user.password_hash, plain_password)


# -------------------------------------------------
# Auth routes
# -------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    existing = User.query.filter_by(username=username).first()
    if existing:
        return jsonify({"message": "Username is already taken"}), 400

    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(username=username, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    return (
        jsonify(
            {
                "message": "User registered",
                "token": access_token,
                "user": user.to_dict_basic(),
            }
        ),
        201,
    )


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not verify_password(user, password):
        return jsonify({"message": "Invalid username or password"}), 401

    access_token = create_access_token(identity=str(user.id))
    return jsonify(
        {"message": "Logged in", "token": access_token, "user": user.to_dict_basic()}
    )


@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    scores = (
        Score.query.filter_by(user_id=user.id)
        .order_by(Score.created_at.desc())
        .limit(20)
        .all()
    )
    return jsonify(
        {
            "user": user.to_dict_basic(),
            "scores": [s.to_dict() for s in scores],
        }
    )


@app.route("/api/debug/users", methods=["GET"])
def debug_users():
    users = User.query.order_by(User.id.asc()).all()
    return jsonify({"users": [u.to_dict_basic() for u in users]})


# -------------------------------------------------
# Scores & leaderboard
# -------------------------------------------------

@app.route("/api/scores", methods=["POST"])
@jwt_required()
def submit_score():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    category_id = data.get("category_id")
    subcategory_id = data.get("subcategory_id")
    score_value = data.get("score")
    total_questions = data.get("total_questions")

    if category_id is None or score_value is None or total_questions is None:
        return (
            jsonify(
                {"message": "category_id, score and total_questions are required"}
            ),
            400,
        )

    try:
        score_int = int(score_value)
        total_int = int(total_questions)
    except ValueError:
        return (
            jsonify({"message": "score and total_questions must be integers"}),
            400,
        )

    new_score = Score(
        user_id=user_id,
        category_id=category_id,
        subcategory_id=subcategory_id,
        score=score_int,
        total_questions=total_int,
    )
    db.session.add(new_score)
    db.session.commit()

    return jsonify({"message": "Score saved", "score": new_score.to_dict()}), 201


@app.route("/api/leaderboard", methods=["GET"])
@jwt_required()  # <<< ONLY CHANGE: leaderboard now requires login
def leaderboard():
    category_id = request.args.get("category_id")
    subcategory_id = request.args.get("subcategory_id")
    try:
        limit = int(request.args.get("limit", 10))
    except ValueError:
        limit = 10

    query = Score.query
    if category_id:
        query = query.filter_by(category_id=category_id)
    if subcategory_id:
        query = query.filter_by(subcategory_id=subcategory_id)

    query = query.order_by(Score.score.desc(), Score.created_at.asc())
    scores = query.limit(limit).all()

    return jsonify({"scores": [s.to_dict() for s in scores]})


# -------------------------------------------------
# OLD generic questions (you can ignore in UI)
# -------------------------------------------------

@app.route("/api/questions", methods=["GET"])
def get_questions():
    category_id = request.args.get("category_id")
    subcategory_id = request.args.get("subcategory_id")

    query = Question.query
    if category_id:
        query = query.filter_by(category_id=category_id)
    if subcategory_id:
        query = query.filter_by(subcategory_id=subcategory_id)

    questions = query.order_by(Question.created_at.asc()).all()
    return jsonify({"questions": [q.to_dict() for q in questions]})


@app.route("/api/questions", methods=["POST"])
@jwt_required()
def create_question():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    category_id = data.get("category_id")
    subcategory_id = data.get("subcategory_id")
    question_text = (data.get("question") or "").strip()
    options = data.get("options") or []
    correct_index = data.get("answerIndex")
    difficulty = data.get("difficulty")

    if not category_id or not question_text or len(options) != 4:
        return (
            jsonify(
                {"message": "category_id, question and 4 options are required"}
            ),
            400,
        )

    try:
        correct_index_int = int(correct_index)
    except (TypeError, ValueError):
        return jsonify({"message": "answerIndex must be 0, 1, 2 or 3"}), 400

    if correct_index_int not in (0, 1, 2, 3):
        return jsonify({"message": "answerIndex must be 0, 1, 2 or 3"}), 400

    q = Question(
        category_id=category_id,
        subcategory_id=subcategory_id,
        question_text=question_text,
        option_a=options[0],
        option_b=options[1],
        option_c=options[2],
        option_d=options[3],
        correct_index=correct_index_int,
        difficulty=difficulty,
        created_by=user_id,
    )
    db.session.add(q)
    db.session.commit()

    return jsonify({"message": "Question created", "question": q.to_dict()}), 201


@app.route("/api/my/questions", methods=["GET"])
@jwt_required()
def my_questions():
    user_id = int(get_jwt_identity())
    category_id = request.args.get("category_id")
    subcategory_id = request.args.get("subcategory_id")

    query = Question.query.filter_by(created_by=user_id)
    if category_id:
        query = query.filter_by(category_id=category_id)
    if subcategory_id:
        query = query.filter_by(subcategory_id=subcategory_id)

    questions = query.order_by(Question.created_at.desc()).all()
    return jsonify({"questions": [q.to_dict() for q in questions]})


@app.route("/api/my/questions/<int:question_id>", methods=["PUT", "PATCH"])
@jwt_required()
def update_my_question(question_id):
    user_id = int(get_jwt_identity())
    q = Question.query.get_or_404(question_id)

    if q.created_by != user_id:
        return jsonify({"message": "You can only edit your own questions"}), 403

    data = request.get_json() or {}

    question_text = data.get("question")
    options = data.get("options")
    correct_index = data.get("answerIndex")
    difficulty = data.get("difficulty")

    if question_text is not None:
        q.question_text = question_text.strip()

    if options is not None:
        if not isinstance(options, list) or len(options) != 4:
            return jsonify({"message": "options must be a list of 4 items"}), 400
        q.option_a, q.option_b, q.option_c, q.option_d = options

    if correct_index is not None:
        try:
            idx = int(correct_index)
        except (TypeError, ValueError):
            return jsonify({"message": "answerIndex must be 0–3"}), 400
        if idx not in (0, 1, 2, 3):
            return jsonify({"message": "answerIndex must be 0–3"}), 400
        q.correct_index = idx

    if difficulty is not None:
        q.difficulty = difficulty

    db.session.commit()
    return jsonify({"message": "Question updated", "question": q.to_dict()})


@app.route("/api/my/questions/<int:question_id>", methods=["DELETE"])
@jwt_required()
def delete_my_question(question_id):
    user_id = int(get_jwt_identity())
    q = Question.query.get_or_404(question_id)

    if q.created_by != user_id:
        return jsonify({"message": "You can only delete your own questions"}), 403

    db.session.delete(q)
    db.session.commit()
    return jsonify({"message": "Question deleted"})


# -------------------------------------------------
# NEW: Custom quiz API
# -------------------------------------------------

@app.route("/api/my/quizzes", methods=["GET"])
@jwt_required()
def list_my_quizzes():
    """
    List all quizzes owned by the current user (no questions).
    """
    user_id = int(get_jwt_identity())
    quizzes = (
        CustomQuiz.query.filter_by(user_id=user_id)
        .order_by(CustomQuiz.created_at.desc())
        .all()
    )
    return jsonify({"quizzes": [q.to_dict(include_questions=False) for q in quizzes]})


@app.route("/api/my/quizzes", methods=["POST"])
@jwt_required()
def create_quiz():
    """
    Create a new empty quiz.
    JSON:
    {
      "title": "My Flags Quiz",
      "description": "European flags round",
      "theme": "custom"   # optional
    }
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    theme = (data.get("theme") or "").strip() or None

    if not title:
        return jsonify({"message": "Title is required"}), 400

    quiz = CustomQuiz(
        user_id=user_id,
        title=title,
        description=description or None,
        theme=theme,
    )
    db.session.add(quiz)
    db.session.commit()

    return jsonify({"message": "Quiz created", "quiz": quiz.to_dict()}), 201


@app.route("/api/my/quizzes/<int:quiz_id>", methods=["GET"])
@jwt_required()
def get_my_quiz(quiz_id):
    """
    Get one quiz with its questions (for editing / playing by the owner).
    """
    user_id = int(get_jwt_identity())
    quiz = CustomQuiz.query.filter_by(id=quiz_id, user_id=user_id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    return jsonify({"quiz": quiz.to_dict(include_questions=True)})


@app.route("/api/my/quizzes/<int:quiz_id>", methods=["PUT", "PATCH"])
@jwt_required()
def update_quiz(quiz_id):
    user_id = int(get_jwt_identity())
    quiz = CustomQuiz.query.filter_by(id=quiz_id, user_id=user_id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description")
    theme = data.get("theme")

    if title is not None:
        quiz.title = title.strip() or quiz.title
    if description is not None:
        quiz.description = description.strip() or None
    if theme is not None:
        quiz.theme = theme.strip() or None

    db.session.commit()
    return jsonify({"message": "Quiz updated", "quiz": quiz.to_dict()})


@app.route("/api/my/quizzes/<int:quiz_id>", methods=["DELETE"])
@jwt_required()
def delete_quiz(quiz_id):
    user_id = int(get_jwt_identity())
    quiz = CustomQuiz.query.filter_by(id=quiz_id, user_id=user_id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    db.session.delete(quiz)
    db.session.commit()
    return jsonify({"message": "Quiz deleted"})


# ---------- quiz questions (inside a custom quiz) ----------

@app.route("/api/my/quizzes/<int:quiz_id>/questions", methods=["POST"])
@jwt_required()
def add_quiz_question(quiz_id):
    """
    Add a question to a specific quiz.

    JSON:
    {
      "question": "Which of these is not a European country?",
      "options": ["France", "Spain", "Brazil", "Germany"],
      "answerIndex": 2
    }
    """
    user_id = int(get_jwt_identity())
    quiz = CustomQuiz.query.filter_by(id=quiz_id, user_id=user_id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    data = request.get_json() or {}
    question_text = (data.get("question") or "").strip()
    options = data.get("options") or []
    correct_index = data.get("answerIndex")

    if not question_text or len(options) != 4:
        return jsonify({"message": "question and exactly 4 options are required"}), 400

    try:
        idx = int(correct_index)
    except (TypeError, ValueError):
        return jsonify({"message": "answerIndex must be 0–3"}), 400

    if idx not in (0, 1, 2, 3):
        return jsonify({"message": "answerIndex must be 0–3"}), 400

    q = CustomQuizQuestion(
        quiz_id=quiz.id,
        question_text=question_text,
        option_a=options[0],
        option_b=options[1],
        option_c=options[2],
        option_d=options[3],
        correct_index=idx,
    )
    db.session.add(q)
    db.session.commit()

    return jsonify({"message": "Quiz question added", "question": q.to_dict()}), 201


@app.route(
    "/api/my/quizzes/<int:quiz_id>/questions/<int:question_id>",
    methods=["PUT", "PATCH"],
)
@jwt_required()
def update_quiz_question(quiz_id, question_id):
    user_id = int(get_jwt_identity())
    quiz = CustomQuiz.query.filter_by(id=quiz_id, user_id=user_id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    q = CustomQuizQuestion.query.filter_by(id=question_id, quiz_id=quiz.id).first()
    if not q:
        return jsonify({"message": "Question not found"}), 404

    data = request.get_json() or {}
    question_text = data.get("question")
    options = data.get("options")
    correct_index = data.get("answerIndex")

    if question_text is not None:
        q.question_text = question_text.strip()

    if options is not None:
        if not isinstance(options, list) or len(options) != 4:
            return jsonify({"message": "options must be a list of 4 items"}), 400
        q.option_a, q.option_b, q.option_c, q.option_d = options

    if correct_index is not None:
        try:
            idx = int(correct_index)
        except (TypeError, ValueError):
            return jsonify({"message": "answerIndex must be 0–3"}), 400
        if idx not in (0, 1, 2, 3):
            return jsonify({"message": "answerIndex must be 0–3"}), 400
        q.correct_index = idx

    db.session.commit()
    return jsonify({"message": "Quiz question updated", "question": q.to_dict()})


@app.route(
    "/api/my/quizzes/<int:quiz_id>/questions/<int:question_id>",
    methods=["DELETE"],
)
@jwt_required()
def delete_quiz_question(quiz_id, question_id):
    user_id = int(get_jwt_identity())
    quiz = CustomQuiz.query.filter_by(id=quiz_id, user_id=user_id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    q = CustomQuizQuestion.query.filter_by(id=question_id, quiz_id=quiz.id).first()
    if not q:
        return jsonify({"message": "Question not found"}), 404

    db.session.delete(q)
    db.session.commit()
    return jsonify({"message": "Quiz question deleted"})


# ---------- play a custom quiz ----------

@app.route("/api/custom-quizzes/<int:quiz_id>/play", methods=["GET"])
@jwt_required()
def play_custom_quiz(quiz_id):
    """
    Fetch a quiz (owned by the current user) with all its questions,
    ready for the frontend to run a solo / 2-player game.
    """
    user_id = int(get_jwt_identity())
    quiz = CustomQuiz.query.filter_by(id=quiz_id, user_id=user_id).first()
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    return jsonify({"quiz": quiz.to_dict(include_questions=True)})


# -------------------------------------------------
# Health
# -------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.utcnow().isoformat()})


# -------------------------------------------------
# Main
# -------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
