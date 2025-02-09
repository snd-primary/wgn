## 要件(概要)

HTML の画面を解析し、その結果を画面設計書として Excel に出力するツール。
HTML 画面のスタイルや DOM の構造を JSON として出力して、それを VBA で読み込み、エクセルシートを生成するようなアプリ。

### HTML 解析処理

- HTML の解析は Playwright(node.js)で処理
- 解析結果を JSON ファイルで保存（画面ごとに）

### 画面設計書生成処理

- JSON ファイルを Excel（VBA）で読み込み
- あらかじめレイアウトを定義しておいたテンプレートシートをコピーして、書き込み処理を行う。

## 用いる技術

- JSON-VBA(OSS ツール)

## Task1:HTML 解析処理の作成

**Goal**

- 一連の処理が問題なく動くことを確認
- 処理が完成したら、これを exe 化する。esbuild でバンドルして、Nodejs の SingleExecutableApplication 機能を使って exe 化する

**npm パッケージ**

- npm
- playwright
- http-server

**規則**

- コードの記述は、vanilla javascript
- 可能な限り ESModules で実装
- 開発は Windows11 で行う。

### 解析対象の HTML をホスティング

npm パッケージの http-server を用いて、解析対象の HTML を http://localhost:3000 でホスティングします。
これを Playwright に解析させます。

### playwright による HTML 解析

- playwright 用のブラウザはシステムの Edge を使う

出力する JSON は、スキーマを持ちます。

```json
{
	"meta": {
		"画面タイトル": ""
	},
	"sheets": {
		"styleSheets": {
			"1": "./css/hoge.css",
			"2": "./css/huga.css"
		},
		"scripts": {
			"1": "./js/huga.js"
		}
	},
	"sounds": {
		"ID名": "",
		"サウンド名": "",
		"繰り返し有無": "",
		"繰返間隔": "",
		"再生タイミング": ""
	},
	"elements": [
		//<body>配下のhtml要素データを、オブジェクトの配列として格納
		{
			"タグ": "div", //タグ名
			"深さ": "1", //body タグが1, 深くなるごとに1づつ数値が上がる
			"属性": {
				"ID属性": {
					//class, id以外の属性
					"hoge": "hoge",
					"hoge": "huga"
				},
				"その他属性": {
					//class, id以外の属性
					"data-hoge": "hoge",
					"data-huga": "huga"
				},
				"クラス名": "font-9, base-layout" //カンマ区切り
			},
			"スタイル": {
				//出力するスタイル情報は以下のプロパティのみ。
				"font-size": "", //font-size
				"color": "", //color
				"display": "", //display
				"position": "" //position
		,
			"位置": {
				"x": "",
				"y": ""
			},
			"サイズ": {
				"width": "",
				"height": ""
			}
		}
	],
	"subdisplay": {
		"画面名": ""
	}
}
```

## アプリの構成

- アプリの実行は、Excel 上で行う。
- excel 上で読み込み対象の HTML があるフォルダを指定する
- 「解析開始」ボタンを押すと、バッチが起動し、nodejs のアプリ(single executable application)の exe ファイルが起動。そして「1.playwright を用いた解析処理」が実行される。
- 「1.playwright を用いた解析処理」によって出力された JSON ファイルを元に、「2.VBA によるシート生成」が実行される。
  excel シートに対して画面設計書の出力を行う

## アプリの処理の流れ

### 1.playwright を用いた解析処理

http-server をもちいて、localhost:3000 で解析対象の HTML をホスティングする。
HTML の解析は、以下の出力になる。
画面ごとに、解析結果の JSON ファイルを出力し、output フォルダに保存する。
出力する JSON のスキーマは以下の通り。

```json
{
	"meta": {
		"画面タイトル": ""
	},
	"sheets": {
		"styleSheets": {
			"1": "./css/hoge.css",
			"2": "./css/huga.css"
		},
		"scripts": {
			"1": "./js/huga.js"
		}
	},
	"sounds": {
		"ID名": "",
		"サウンド名": "",
		"繰り返し有無": "",
		"繰返間隔": "",
		"再生タイミング": ""
	},
	"elements": [
		//<body>配下のhtml要素データを、オブジェクトの配列として格納
		{
			"タグ": "div", //タグ名
			"深さ": "1", //body タグが1, 深くなるごとに1づつ数値が上がる
			"属性": {
				"ID属性": {
					//class, id以外の属性
					"hoge": "hoge",
					"hoge": "huga"
				},
				"その他属性": {
					//class, id以外の属性
					"data-hoge": "hoge",
					"data-huga": "huga"
				},
				"クラス名": "font-9, base-layout" //カンマ区切り
			},
			"スタイル": {
				//出力するスタイル情報は以下のプロパティのみ。
				"font-size": "", //font-size
				"color": "", //color
				"display": "", //display
				"position": "" //position
		,
			"位置": {
				"x": "",
				"y": ""
			},
			"サイズ": {
				"width": "",
				"height": ""
			}
		}
	],
	"subdisplay": {
		"画面名": ""
	}
}
```

#### 2.VBA によるシート生成

- 出力された JSON を読み込む（JSON-VBA）
- template シートをコピーし、そこに情報を転記していく

## 技術スタック

### nodejs

- npm
- playwright
- http-server

### vba

- JSON-VBA(OSS ツール)

- テンプレートシートの具体的なレイアウト（どの項目をどのセルに出力するか）

以下の JSON ファイルに、出力するセルを指示し他コメントを追記しています.
新たに添付した template シートと見比べてください。

```json
{
	"meta": {
		"画面タイトル": "" //B1
	},
	"sheets": {
		"styleSheets": {
			"1": "./css/hoge.css", //C30から。足りなければ下にセルを増やす
			"2": "./css/huga.css"
		},
		"scripts": {
			"1": "./js/huga.js" //D36から。足りなければ下に行を増やす
		}
	},
	"sounds": {
		"ID名": "", //M30
		"サウンド名": "", //M31
		"繰り返し有無": "", //M32
		"繰返間隔": "", //M33
		"再生タイミング": "" //M34
	},
	"elements": [
		//<body>配下のhtml要素データを、オブジェクトの配列として格納
		{
			"タグ": "div", //C44~H44からスタート。深さが小さいほうが左
			"深さ": "1",
			"属性": {
				"ID属性": { //I44から
					"hoge": "hoge",
					"hoge": "huga"
				},
				"その他属性": { //J44から
					"data-hoge": "hoge",
					"data-huga": "huga"
				},
				"クラス名": "font-9, base-layout" //K44から
			},
			"スタイル": { //K44から。オブジェクト内部をカンマ区切りで一つのセルに。
				"文字サイズ": "", //font-size
				"文字色": "", //color
				"ディスプレイ": "", //display
				"ポジション": "" //position
		,

		}
	],

}
```

- 複数の HTML 要素がある場合の出力方法（改ページ等の扱い）
  改ページはなしで大丈夫です。

- スタイルやフォーマットの継承方法
  テンプレートシートを都度コピーして使用してください。

## ビルド手順

# 1. esbuild でバンドル

npm run build

# 2. Single Executable Application blob の作成

npm run make:exe

# 3. exe 作成

node make-exe.js

# 実行

{
"main": "./dist/bundle.js",
"output": "./dist/sea-prep.blob"
}
