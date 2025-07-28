
# tripot0728_jeey
가족마당 코드 공유 

## docker 실행
```
docker-compose up --build
```

## 앱 2개 동시 실행하기

```
npx react-native run-android
npx react-native start --port 8082
```

#### port 8081에 가족 앱 연결 후 어르신 앱 키고 
```
adb shell input keyevent 82
```
 - change bundle location 클릭 후 ip주소:8082

## .env 파일에 들어가야 할 내용
 - openai, pinecone api key
 - MYSQL_DATABASE=tripot_db
 - MYSQL_USER=tripot_user
 - MYSQL_PASSWORD=1234
 - DB_HOST=db
 - MYSQL_ROOT_PASSWORD=123123

## user_id 및 ip수정 필요 파일
###  어르신앱 
- app.tsx
- speakscereen.tsx

### 자녀앱 
- services/.api.ts
- app.tsx

### 백앤드 
- generate_reports.py

