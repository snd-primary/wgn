' モジュールの先頭で定数を定義
Private Const STYLESHEETS_START_ROW As Long = 31    ' Stylesheetsの開始行
Private Const STYLESHEETS_START_COL As Long = 4     ' Stylesheetsの開始列（D列）
Private Const ELEMENTS_START_ROW As Long = 43       ' Elementsの開始行
Private Const ELEMENTS_START_COL As Long = 3        ' Elementsの開始列（D列）

' CSSプロパティの和名マッピング用の定数を定義
Private Const CSS_PROPERTY_JAPANESE_MAPPING As String = _
    "font-size:フォントサイズ;" & _
    "font-family:フォントファミリー;" & _
    "color:文字色;" & _
    "background-color:背景色"


' JSONファイル読み込み関数
Private Function ReadJsonFromFile(ByVal filePath As String) As Object
    On Error GoTo ErrorHandler
    
    ' ADODB.Streamを使用してUTF-8ファイルを読み込む
    Dim stream As Object
    Dim jsonText As String
    
    Set stream = CreateObject("ADODB.Stream")
    
    With stream
        .Charset = "UTF-8"
        .Type = 2  ' テキストモード
        .Open
        .LoadFromFile filePath
        jsonText = .ReadText
        .Close
    End With
    
    ' JSON文字列をオブジェクトに変換
    Set ReadJsonFromFile = JsonConverter.ParseJSON(jsonText)
    
    ' クリーンアップ
    Set stream = Nothing
    Exit Function

ErrorHandler:
    MsgBox "Error reading JSON file: " & Err.Description, vbCritical
    Set ReadJsonFromFile = Nothing
End Function

'メインの実行サブルーチン
Public Sub ProcessAllJSON()
    ' フォルダパスの設定
    Const FOLDER_PATH As String = "C:\Users\sndwe\prac\wgn2\output"  ' JSONファイルのあるフォルダパス
    
    ' JSONファイルの一覧を取得
    Dim jsonFiles As collection
    Set jsonFiles = GetJSONFilesInFolder(FOLDER_PATH)
    
    ' ファイルが見つからない場合
    If jsonFiles.Count = 0 Then
        MsgBox "JSONファイルが見つかりませんでした。", vbInformation
        Exit Sub
    End If
    
    ' 進捗バーの初期化
    Application.ScreenUpdating = False
    
    ' 各JSONファイルを処理
    Dim filePath As Variant
    Dim processedCount As Long
    processedCount = 0
    
    For Each filePath In jsonFiles
        ' JSONデータの読み込み
        Dim jsonObj As Dictionary
        Set jsonObj = ReadJsonFromFile(filePath)
        
        If Not jsonObj Is Nothing Then
            ' シートの作成とデータの書き込み
            Dim ws As Worksheet
            Set ws = CreateNewSheetFromTemplate(jsonObj)
            
            If Not ws Is Nothing Then
                WriteJSONDataToSheet ws, jsonObj
                processedCount = processedCount + 1
            End If
        End If
    Next filePath
    
    ' 画面更新を再開
    Application.ScreenUpdating = True
    
    ' 完了通知
    MsgBox "処理が完了しました。" & vbCrLf & _
           "処理したファイル数: " & processedCount & "/" & jsonFiles.Count, vbInformation
End Sub

'outputフォルダからJSONファイルをすべて取得する関数
Private Function GetJSONFilesInFolder(ByVal folderPath As String) As collection
    Dim files As New collection
    Dim fileName As String
    
    ' フォルダが存在するか確認
    If Dir(folderPath, vbDirectory) = "" Then
        MsgBox "指定されたフォルダが見つかりません: " & folderPath, vbCritical
        Set GetJSONFilesInFolder = files
        Exit Function
    End If
    
    ' JSONファイルを検索
    fileName = Dir(folderPath & "\*.json")
    
    ' 見つかったJSONファイルをコレクションに追加
    Do While fileName <> ""
        files.Add folderPath & "\" & fileName
        fileName = Dir()
    Loop
    
    Set GetJSONFilesInFolder = files
End Function


' テンプレートからシートを作成する関数
Private Function CreateNewSheetFromTemplate(ByVal jsonObj As Dictionary) As Worksheet
    ' テンプレートの存在確認
    Dim templateSheet As Worksheet
    On Error Resume Next
    Set templateSheet = ThisWorkbook.Worksheets("template")
    On Error GoTo 0
    
    If templateSheet Is Nothing Then
        MsgBox "テンプレートシート「template」が見つかりません。", vbCritical
        Exit Function
    End If
    
    ' 新しいシートの作成
    templateSheet.Copy After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count)
    Set CreateNewSheetFromTemplate = ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count)
    
    ' シート名の設定
    Dim sheetName As String
    sheetName = jsonObj("meta")("title")  ' metaオブジェクトからtitleを取得
    
    ' シート名として使えない文字をアンダースコアに置換
    sheetName = Replace(sheetName, "\", "_")
    sheetName = Replace(sheetName, "/", "_")
    sheetName = Replace(sheetName, "?", "_")
    sheetName = Replace(sheetName, "*", "_")
    sheetName = Replace(sheetName, "[", "_")
    sheetName = Replace(sheetName, "]", "_")
    
    ' シート名が31文字を超える場合は切り詰める（Excelの制限）
    If Len(sheetName) > 31 Then
        sheetName = Left(sheetName, 31)
    End If
    
    ' 同名のシートが存在する場合は、末尾に番号を付加
    Dim baseSheetName As String
    baseSheetName = sheetName
    Dim counter As Integer
    counter = 1
    
    While WorksheetExists(sheetName)
        sheetName = Left(baseSheetName, 28) & "_" & counter
        counter = counter + 1
    Wend
    
    CreateNewSheetFromTemplate.Name = sheetName
    
End Function

' シートの存在をチェックするヘルパー関数
Private Function WorksheetExists(ByVal sheetName As String) As Boolean
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    WorksheetExists = Not ws Is Nothing
End Function

' JSONデータをシートに書き込む関数

Private Sub WriteJSONDataToSheet(ByVal ws As Worksheet, ByVal jsonObj As Dictionary)
    ' soundsセクションの書き込み
    WriteSoundsSection ws, jsonObj("sounds")
     
'     stylesheetsの書き込み
    WriteStylesheetsSection ws, jsonObj("stylesheets"), STYLESHEETS_START_ROW, STYLESHEETS_START_COL
    
    ' Elementsの書き込み（開始位置：D41）
    WriteElementsSection ws, jsonObj("elements"), ELEMENTS_START_ROW, ELEMENTS_START_COL
End Sub

Private Function WriteStylesheetsSection(ByVal ws As Worksheet, _
                                       ByVal stylesheets As Dictionary, _
                                       ByVal startRow As Long, _
                                       ByVal startCol As Long) As Long
    Dim currentRow As Long
    currentRow = 31    ' 開始行を31に固定
    
    ' 列の位置を明示的に定義
    Const KEY_COLUMN As Long = 2     ' B列
    Const VALUE_COLUMN As Long = 3   ' C列
    
    ' データの開始行を保存（枠線用）
    Dim startingRow As Long
    startingRow = currentRow
    
    ' データ書き込み
    Dim key As Variant
    For Each key In stylesheets.keys
        ws.Cells(currentRow, KEY_COLUMN).value = key           ' B列にkey
        ws.Cells(currentRow, VALUE_COLUMN).value = stylesheets(key)  ' C列にvalue
        currentRow = currentRow + 1
    Next key
    
    ' 枠線の追加（データ部分全体を囲む）
    With ws.Range(ws.Cells(startingRow, KEY_COLUMN), ws.Cells(currentRow - 1, VALUE_COLUMN)).Borders
        .LineStyle = xlContinuous  ' 実線
        .Weight = xlThin          ' 細線
        .ColorIndex = xlAutomatic ' 黒色
    End With
    
    ' データの各セルに枠線を追加
    With ws.Range(ws.Cells(startingRow, KEY_COLUMN), ws.Cells(currentRow - 1, VALUE_COLUMN))
        .Borders(xlInsideHorizontal).LineStyle = xlContinuous
        .Borders(xlInsideVertical).LineStyle = xlContinuous
    End With
    
    ' 空行を追加
    currentRow = currentRow + 1
    
    WriteStylesheetsSection = currentRow
End Function

Private Sub WriteElementsSection(ByVal ws As Worksheet, _
                               ByVal elements As collection, _
                               ByVal startRow As Long, _
                               ByVal startCol As Long)
    Dim currentRow As Long
    currentRow = startRow
    
    ' 定数で列位置を定義
    Const COL_DIMENTION As Long = 9     ' I列
    Const COL_SIZE As Long = 10         ' J列
    Const COL_ID As Long = 11           ' K列
    Const COL_OTHER_ATTR As Long = 12   ' L列
    Const COL_CLASSNAME As Long = 13    ' M列
    Const COL_STYLE As Long = 14        ' N列
    
    ' データ書き込み
    Dim i As Long
    Dim element As Dictionary
    Dim outputColumn As Long
    Dim idDict As Dictionary
    Dim otherAttrDict As Dictionary
    Dim sizeDict As Dictionary
    Dim dimentionDict As Dictionary
    Dim styleDict As Dictionary
    
    For i = 1 To elements.Count
        Set element = elements(i)
        
        ' tagの出力（既存の処理）
        outputColumn = 3 + element("depth") - 1
        ws.Cells(currentRow, outputColumn).value = element("tag")
        
        ' dimentionの出力
        Set dimentionDict = element("dimention")
        ws.Cells(currentRow, COL_DIMENTION).value = FormatDimentionAttributes(dimentionDict)
        ws.Cells(currentRow, COL_DIMENTION).WrapText = True
        
        ' sizeの出力
        Set sizeDict = element("size")
        ws.Cells(currentRow, COL_SIZE).value = FormatSizeAttributes(sizeDict)
        ws.Cells(currentRow, COL_SIZE).WrapText = True
        
        ' idの出力
        Set idDict = element("id")
        Dim firstKey As Variant
        firstKey = idDict.keys()(0)
        ws.Cells(currentRow, COL_ID).value = idDict(firstKey)
        
        ' other-attrの出力
        Set otherAttrDict = element("other-attr")
        ws.Cells(currentRow, COL_OTHER_ATTR).value = FormatOtherAttributes(otherAttrDict)
        ws.Cells(currentRow, COL_OTHER_ATTR).WrapText = True  ' 改行を有効化
        
        ' classnameの出力
        ws.Cells(currentRow, COL_CLASSNAME).value = FormatClassNames(element("classname"))
        ws.Cells(currentRow, COL_CLASSNAME).WrapText = True  ' 改行を有効化
        
        ' styleの出力
        Set styleDict = element("style")
        ws.Cells(currentRow, COL_STYLE).value = FormatStyleAttributes(styleDict)
        ws.Cells(currentRow, COL_STYLE).WrapText = True
        
        currentRow = currentRow + 1
    Next i
End Sub

'その他の属性を出力
Private Function FormatOtherAttributes(ByVal attrDict As Dictionary) As String
    Dim result As String
    Dim key As Variant
    
    ' 各属性を整形して結合
    For Each key In attrDict.keys
        If Len(result) > 0 Then
            result = result & vbNewLine  ' 改行を追加
        End If
        result = result & """" & key & """: """ & attrDict(key) & """"  ' "key": "value" の形式
    Next key
    
    FormatOtherAttributes = result
End Function

'サイズ情報の出力
Private Function FormatSizeAttributes(ByVal sizeDict As Dictionary) As String
    Dim result As String
    Dim key As Variant
    
    ' 各サイズ属性を整形して結合
    For Each key In sizeDict.keys
        If Len(result) > 0 Then
            result = result & vbNewLine  ' 改行を追加
        End If
        result = result & """" & key & """: " & sizeDict(key)  ' "key": value の形式
    Next key
    
    FormatSizeAttributes = result
End Function

'位置情報の出力
Private Function FormatDimentionAttributes(ByVal dimentionDict As Dictionary) As String
    Dim result As String
    Dim key As Variant
    
    ' 各dimention属性を整形して結合
    For Each key In dimentionDict.keys
        If Len(result) > 0 Then
            result = result & vbNewLine  ' 改行を追加
        End If
        result = result & """" & key & """: " & dimentionDict(key)  ' "key": value の形式
    Next key
    
    FormatDimentionAttributes = result
End Function

'スタイル情報の出力
Private Function FormatStyleAttributes(ByVal styleDict As Dictionary) As String
    Dim result As String
    Dim key As Variant
    Dim japaneseMapping As Dictionary
    
    ' 和名マッピング辞書を作成
    Set japaneseMapping = CreateCSSPropertyMapping()
    
    ' 各style属性を整形して結合（和名変換を行う）
    For Each key In styleDict.keys
        If Len(result) > 0 Then
            result = result & vbNewLine
        End If
        ' キー名を和名に変換
        Dim japanesePropName As String
        japanesePropName = GetJapanesePropertyName(CStr(key), japaneseMapping)
        
        result = result & """" & japanesePropName & """: """ & styleDict(key) & """"
    Next key
    
    FormatStyleAttributes = result
End Function

'CSSプロパティの和名変換を行うヘルパー関数
Private Function CreateCSSPropertyMapping() As Dictionary
    Dim dict As Dictionary
    Set dict = New Dictionary
    
    ' マッピング文字列を分割して辞書に格納
    Dim pairs As Variant
    pairs = Split(CSS_PROPERTY_JAPANESE_MAPPING, ";")
    
    Dim pair As Variant
    Dim keyValue As Variant
    For Each pair In pairs
        keyValue = Split(pair, ":")
        If UBound(keyValue) = 1 Then
            dict.Add keyValue(0), keyValue(1)
        End If
    Next pair
    
    Set CreateCSSPropertyMapping = dict
End Function

'CSSプロパティの和名のリストを取得
Private Function GetJapanesePropertyName(ByVal englishName As String, ByVal mappingDict As Dictionary) As String
    If mappingDict.Exists(englishName) Then
        GetJapanesePropertyName = mappingDict(englishName)
    Else
        ' マッピングが存在しない場合は英語名をそのまま返す
        GetJapanesePropertyName = englishName
    End If
End Function

' classnameを改行形式に整形する関数
Private Function FormatClassNames(ByVal classNamesStr As String) As String
    ' カンマで分割して改行で結合
    Dim classes As Variant
    Dim result As String
    
    ' カンマで分割（スペースを削除）
    classes = Split(Replace(classNamesStr, " ", ""), ",")
    
    ' 改行で結合
    Dim i As Long
    For i = LBound(classes) To UBound(classes)
        If Len(result) > 0 Then
            result = result & vbNewLine
        End If
        result = result & classes(i)
    Next i
    
    FormatClassNames = result
End Function


'サウンド情報の出力
Private Sub WriteSoundsSection(ByVal ws As Worksheet, ByVal sounds As Dictionary)
    ' 定数で列位置と開始行を定義
    Const SOUNDS_COL As Long = 14    ' N列
    Const SOUNDS_START_ROW As Long = 30  ' 30行目から開始
    
    Dim currentRow As Long
    currentRow = SOUNDS_START_ROW
    
    ' soundsオブジェクトの各値を出力
    Dim key As Variant
    For Each key In sounds.keys
        ' 値を出力
        ws.Cells(currentRow, SOUNDS_COL).value = sounds(key)
        
        ' セルの書式を左寄せに設定
        ws.Cells(currentRow, SOUNDS_COL).HorizontalAlignment = xlLeft
        
        currentRow = currentRow + 1
    Next key
End Sub
