from google import genai
import os

# 여기에 승현님의 API 키를 넣으세요
client = genai.Client(api_key="AIzaSyAHTax8E7r__yxebf5UNR17DiKVeeGuPZM")

print("--- 사용 가능한 모델 목록 ---")
try:
    # 내 키로 쓸 수 있는 모델들을 출력합니다
    for model in client.models.list():
        print(f"모델 이름: {model.name}")
except Exception as e:
    print(f"에러 발생: {e}")