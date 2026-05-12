from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True) # 로그인 ID
    password = Column(String) # 비밀번호
    username = Column(String) # 사용자 이름