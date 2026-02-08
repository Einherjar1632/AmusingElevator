# エレベーターたいけん

こども向けのエレベーター体験アプリです。  
React Native + Expo で実装しています。

## 主な機能
- 1〜10階の行き先ボタン
- エレベーターの移動・到着・扉開閉アニメーション
- 開/閉ボタンでの手動ドア操作
- 連続押下時のエレベーターらしい運行順制御
- 到着後の一定時間待機と自動閉扉
- フロアごとの案内表示とキャラクター演出
- 効果音再生（`expo-av`）
- クレジット画面

## 画面
- 体験画面（メイン）
- クレジット画面

## セットアップ
```bash
npm install
```

## 起動（iOS シミュレータ）
```bash
npm run ios
```

## 起動（iOS 実機）
```bash
npx expo run:ios --device <DEVICE_ID>
```

オフライン起動の確認を含める場合は Release ビルドを推奨します。

```bash
npx expo run:ios --device <DEVICE_ID> --configuration Release
```

## アプリアイコン
- `assets/icon.png`
- iOS AppIcon: `ios/app/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`

## クレジット
### 音源
- ポケットサウンド  
  https://pocket-se.info/

### 使用技術
- Expo
- React Native
- TypeScript
- expo-av / expo-asset / expo-speech

## 補足
- 画面下部の広告エリアは現在プレースホルダです（実広告SDKは未接続）。
