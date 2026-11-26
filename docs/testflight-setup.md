# TestFlight 첫 설정 (한 번만, PC에서 약 30분)

이 과정만 한 번 하면, 이후에는 제가 코드를 올릴 때마다 자동으로 업데이트가 나갑니다.

## 0. 준비물 확인
- [ ] Apple 개발자 계정이 유효한지: https://developer.apple.com/account → "Membership details"에 만료일이 보이면 OK
- [ ] Expo 계정 만들기 (무료): https://expo.dev/signup
- [ ] PC에 Node.js LTS 설치: https://nodejs.org (이미 있으면 건너뛰기)

## 1. 최신 코드 받기
1. https://github.com/sunbagchan23-dotcom/wellness-app 에서 초록색 `Code` → `Download ZIP`
2. 바탕화면\클로드 에 압축 풀기 → `wellness-app-main` 폴더가 생김
3. 그 폴더를 열고, 주소창에 `cmd` 입력 → Enter (검은 창)

## 2. 검은 창에 한 줄씩 입력
```
npm install
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest update:configure
npx eas-cli@latest build -p ios --profile production
```
- `login`: Expo 계정 이메일·비밀번호
- `init`: "Would you like to create a project?" → Y
- `build`: Apple ID 로그인을 물으면 Y → Apple ID, 비밀번호, 폰에 뜬 인증번호 입력.
  인증서·프로비저닝 프로필을 만들지 물으면 전부 Y (EAS가 알아서 만듦)
- 빌드는 Expo 클라우드에서 10~20분 걸려요. 창을 닫아도 됩니다.

## 3. 빌드가 끝나면 TestFlight로 보내기
```
npx eas-cli@latest submit -p ios --latest
```
- Apple ID 로그인, App Store Connect API 키를 만들지 물으면 Y
- 앱이 App Store Connect에 없으면 만들지 물어요 → Y

## 4. 자동화 연결
1. https://expo.dev/settings/access-tokens → `Create token` → 이름 아무거나 → 토큰 복사
2. https://github.com/sunbagchan23-dotcom/wellness-app/settings/secrets/actions → `New repository secret`
   - Name: `EXPO_TOKEN`, Secret: 복사한 토큰
3. `wellness-app-main` 폴더의 `app.json` 파일 내용을 저에게 보내 주세요 (프로젝트 ID를 저장소에 반영할게요)

## 5. 아이폰에서 설치
- App Store에서 **TestFlight** 앱 설치 → 같은 Apple ID로 로그인
- App Store Connect(https://appstoreconnect.apple.com) → 앱 → TestFlight → 내부 테스트 그룹에 본인 추가
- 처리(10~30분)가 끝나면 TestFlight 앱에 "Wellness"가 뜹니다 → 설치

막히면 검은 창의 글자를 그대로 복사해서 보내 주세요.
