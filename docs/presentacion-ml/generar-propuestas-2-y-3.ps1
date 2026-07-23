param(
  [string]$OutputDirectory = $PSScriptRoot,
  [string]$BaseName = 'INHALEX-Propuestas-2-y-3-MongoDB'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Point = 72.0
$script:Colors = @{
  White = 0xFFFFFF
  Panel = 0xF7F9FC
  Ink = 0x172033
  Muted = 0x5D6878
  Border = 0xDDE4EC
  Blue = 0x2F5D88
  PaleBlue = 0xEAF1F8
  Green = 0x0A8A63
  DarkGreen = 0x126347
  PaleGreen = 0xE7F7F0
  Purple = 0x7C35E8
  PalePurple = 0xF3EAFF
  Amber = 0xD97A00
  PaleAmber = 0xFFF5DE
  Red = 0xC75050
}

function Convert-ToPoint([double]$Value) {
  return [single]($Value * $script:Point)
}

function Convert-Color([int]$Rgb) {
  $r = ($Rgb -shr 16) -band 0xFF
  $g = ($Rgb -shr 8) -band 0xFF
  $b = $Rgb -band 0xFF
  return [int]($r + 256 * $g + 65536 * $b)
}

function Set-SlideBackground($Slide, [int]$Color) {
  $Slide.FollowMasterBackground = 0
  $Slide.Background.Fill.Solid()
  $Slide.Background.Fill.ForeColor.RGB = Convert-Color $Color
}

function Add-Text {
  param(
    $Slide,
    [string]$Text,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [double]$Size = 18,
    [int]$Color = 0x172033,
    [switch]$Bold,
    [int]$Align = 1,
    [double]$Margin = 0.04,
    [int]$VerticalAnchor = 1
  )
  $shape = $Slide.Shapes.AddTextbox(
    1,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
  $shape.TextFrame2.TextRange.Text = $Text
  $shape.TextFrame2.AutoSize = 0
  $shape.TextFrame2.WordWrap = -1
  $shape.TextFrame2.MarginLeft = Convert-ToPoint $Margin
  $shape.TextFrame2.MarginRight = Convert-ToPoint $Margin
  $shape.TextFrame2.MarginTop = Convert-ToPoint $Margin
  $shape.TextFrame2.MarginBottom = Convert-ToPoint $Margin
  $shape.TextFrame2.VerticalAnchor = $VerticalAnchor
  $shape.TextFrame2.TextRange.Font.Name = 'Aptos'
  $shape.TextFrame2.TextRange.Font.Size = [single]$Size
  $shape.TextFrame2.TextRange.Font.Bold = if ($Bold) { -1 } else { 0 }
  $shape.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $Color
  $shape.TextFrame2.TextRange.ParagraphFormat.Alignment = $Align
  return $shape
}

function Add-RoundedBox {
  param(
    $Slide,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [int]$FillColor = 0xFFFFFF,
    [int]$LineColor = 0xDDE4EC,
    [double]$LineWeight = 1,
    [switch]$Shadow
  )
  $shape = $Slide.Shapes.AddShape(
    5,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
  $shape.Fill.Solid()
  $shape.Fill.ForeColor.RGB = Convert-Color $FillColor
  $shape.Line.ForeColor.RGB = Convert-Color $LineColor
  $shape.Line.Weight = [single]$LineWeight
  if ($Shadow) {
    try {
      $shape.Shadow.Visible = -1
      $shape.Shadow.Blur = 7
      $shape.Shadow.Transparency = 0.86
      $shape.Shadow.OffsetX = 1
      $shape.Shadow.OffsetY = 2
    } catch {}
  }
  return $shape
}

function Add-Pill {
  param(
    $Slide,
    [string]$Text,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H = 0.32,
    [int]$FillColor = 0xE7F7F0,
    [int]$TextColor = 0x126347,
    [double]$Size = 8.4,
    [int]$LineColor = 0xDDE4EC
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H `
    -FillColor $FillColor -LineColor $LineColor -LineWeight 0.7)
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.04) -Y $Y `
    -W ($W - 0.08) -H $H -Size $Size -Color $TextColor -Bold -Align 2)
}

function Add-Header {
  param(
    $Slide,
    [string]$Title,
    [string]$Type,
    [int]$AccentColor,
    [int]$PaleAccent,
    [string]$IconText
  )
  [void](Add-RoundedBox -Slide $Slide -X 0.48 -Y 0.22 -W 0.48 -H 0.48 `
    -FillColor $PaleAccent -LineColor $PaleAccent -LineWeight 0)
  [void](Add-Text -Slide $Slide -Text $IconText -X 0.53 -Y 0.25 -W 0.38 -H 0.38 `
    -Size 18 -Color $AccentColor -Bold -Align 2)
  [void](Add-Text -Slide $Slide -Text $Title -X 1.08 -Y 0.25 -W 8.9 -H 0.48 `
    -Size 23.5 -Color $script:Colors.Ink -Bold)
  Add-Pill -Slide $Slide -Text $Type -X 10.43 -Y 0.29 -W 2.38 -H 0.36 `
    -FillColor $PaleAccent -TextColor $AccentColor -Size 9.4 -LineColor $PaleAccent
  $line = $Slide.Shapes.AddShape(
    1,
    (Convert-ToPoint 0.48),
    (Convert-ToPoint 0.92),
    (Convert-ToPoint 12.35),
    (Convert-ToPoint 0.018)
  )
  $line.Fill.Solid()
  $line.Fill.ForeColor.RGB = Convert-Color $script:Colors.Border
  $line.Line.Visible = 0
}

function Add-Panel {
  param(
    $Slide,
    [string]$Title,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H `
    -FillColor $script:Colors.Panel -LineColor $script:Colors.Border -LineWeight 0.9)
  [void](Add-Text -Slide $Slide -Text $Title -X ($X + 0.22) -Y ($Y + 0.15) `
    -W ($W - 0.44) -H 0.28 -Size 11.2 -Color $script:Colors.Muted -Bold)
}

function Add-CollectionCard {
  param(
    $Slide,
    [string]$Name,
    [string[]]$Fields,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [int]$HeaderColor = 0x2F5D88,
    [double]$FieldSize = 9.1
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H $H `
    -FillColor $script:Colors.White -LineColor $HeaderColor -LineWeight 1.0 -Shadow)
  $header = $Slide.Shapes.AddShape(
    5,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint 0.34)
  )
  $header.Fill.Solid()
  $header.Fill.ForeColor.RGB = Convert-Color $HeaderColor
  $header.Line.Visible = 0
  [void](Add-Text -Slide $Slide -Text $Name -X ($X + 0.06) -Y ($Y + 0.015) `
    -W ($W - 0.12) -H 0.3 -Size 11.5 -Color $script:Colors.White -Bold -Align 2)
  $fieldText = ($Fields | ForEach-Object { "• $_" }) -join "`n"
  [void](Add-Text -Slide $Slide -Text $fieldText -X ($X + 0.16) -Y ($Y + 0.43) `
    -W ($W - 0.32) -H ($H - 0.5) -Size $FieldSize -Color $script:Colors.Ink)
}

function Add-FlowArrow {
  param(
    $Slide,
    [string]$Text,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [int]$Color
  )
  [void](Add-Text -Slide $Slide -Text $Text `
    -X ($X - 0.22) -Y $Y -W ($W + 0.44) -H ($H - 0.72) `
    -Size 7.15 -Color $script:Colors.Ink -Bold -Align 2)
  $arrow = $Slide.Shapes.AddShape(
    33,
    (Convert-ToPoint $X),
    (Convert-ToPoint ($Y + $H - 0.63)),
    (Convert-ToPoint $W),
    (Convert-ToPoint 0.63)
  )
  $arrow.Fill.Solid()
  $arrow.Fill.ForeColor.RGB = Convert-Color $Color
  $arrow.Line.Visible = 0
}

function Add-DataTable {
  param(
    $Slide,
    [string[]]$Headers,
    [object[]]$Rows,
    [double[]]$ColumnWidths,
    [double]$X,
    [double]$Y,
    [double]$W,
    [double]$H,
    [double]$FontSize = 7.7,
    [int]$HeaderColor = 0x126347,
    [int]$LastHeaderColor = 0x7C35E8,
    [switch]$HighlightLastColumn
  )
  $shape = $Slide.Shapes.AddTable(
    $Rows.Count + 1,
    $Headers.Count,
    (Convert-ToPoint $X),
    (Convert-ToPoint $Y),
    (Convert-ToPoint $W),
    (Convert-ToPoint $H)
  )
  $table = $shape.Table
  for ($column = 1; $column -le $Headers.Count; $column++) {
    $table.Columns.Item($column).Width = Convert-ToPoint $ColumnWidths[$column - 1]
    for ($row = 1; $row -le ($Rows.Count + 1); $row++) {
      $cell = $table.Cell($row, $column).Shape
      $cell.TextFrame2.MarginLeft = Convert-ToPoint 0.02
      $cell.TextFrame2.MarginRight = Convert-ToPoint 0.02
      $cell.TextFrame2.MarginTop = Convert-ToPoint 0.012
      $cell.TextFrame2.MarginBottom = Convert-ToPoint 0.012
      $cell.TextFrame2.VerticalAnchor = 3
      $cell.TextFrame2.TextRange.Font.Name = 'Aptos'
      $cell.TextFrame2.TextRange.Font.Size = [single]$FontSize
      $cell.TextFrame2.TextRange.ParagraphFormat.Alignment = 2
      try { $cell.Line.ForeColor.RGB = Convert-Color $script:Colors.Border } catch {}
    }
  }
  for ($column = 1; $column -le $Headers.Count; $column++) {
    $cell = $table.Cell(1, $column).Shape
    $cell.TextFrame2.TextRange.Text = $Headers[$column - 1]
    $cell.TextFrame2.TextRange.Font.Bold = -1
    $cell.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.White
    $cell.Fill.Solid()
    if ($HighlightLastColumn -and $column -eq $Headers.Count) {
      $cell.Fill.ForeColor.RGB = Convert-Color $LastHeaderColor
    } else {
      $cell.Fill.ForeColor.RGB = Convert-Color $HeaderColor
    }
  }
  for ($row = 2; $row -le ($Rows.Count + 1); $row++) {
    for ($column = 1; $column -le $Headers.Count; $column++) {
      $cell = $table.Cell($row, $column).Shape
      $cell.TextFrame2.TextRange.Text = [string]$Rows[$row - 2][$column - 1]
      $cell.TextFrame2.TextRange.Font.Fill.ForeColor.RGB = Convert-Color $script:Colors.Ink
      $cell.Fill.Solid()
      if ($HighlightLastColumn -and $column -eq $Headers.Count) {
        $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.PalePurple
        $cell.TextFrame2.TextRange.Font.Bold = -1
      } elseif ($row % 2 -eq 0) {
        $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.White
      } else {
        $cell.Fill.ForeColor.RGB = Convert-Color $script:Colors.PaleBlue
      }
    }
  }
  return $shape
}

function Add-GroupBand {
  param(
    $Slide,
    [string]$Text,
    [double]$X,
    [double]$Y,
    [double]$W,
    [int]$FillColor,
    [int]$TextColor
  )
  [void](Add-RoundedBox -Slide $Slide -X $X -Y $Y -W $W -H 0.22 `
    -FillColor $FillColor -LineColor $FillColor -LineWeight 0)
  [void](Add-Text -Slide $Slide -Text $Text -X ($X + 0.02) -Y $Y `
    -W ($W - 0.04) -H 0.22 -Size 6.9 -Color $TextColor -Bold -Align 2)
}

function Set-SpeakerNotes($Slide, [string]$Notes) {
  try {
    $placeholders = $Slide.NotesPage.Shapes.Placeholders
    for ($index = 1; $index -le $placeholders.Count; $index++) {
      $placeholder = $placeholders.Item($index)
      if ($placeholder.PlaceholderFormat.Type -eq 2) {
        $placeholder.TextFrame.TextRange.Text = $Notes
        return
      }
    }
  } catch {}
}

$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $output -Force | Out-Null
$pptxPath = Join-Path $output "$BaseName.pptx"
$pdfPath = Join-Path $output "$BaseName.pdf"
$slide2PngPath = Join-Path $output "$BaseName-01-Propuesta-2.png"
$slide3PngPath = Join-Path $output "$BaseName-02-Propuesta-3.png"

$powerPoint = $null
$presentation = $null
$slide2 = $null
$slide3 = $null
$powerPointIdsBefore = @(
  Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id }
)
$ownedPowerPointIds = @()

try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $ownedPowerPointIds = @(
    Get-Process POWERPNT -ErrorAction SilentlyContinue |
      Where-Object { $_.Id -notin $powerPointIdsBefore } |
      ForEach-Object { $_.Id }
  )
  $powerPoint.Visible = -1
  $powerPoint.DisplayAlerts = 1
  try { $powerPoint.WindowState = 2 } catch {}

  $presentation = $powerPoint.Presentations.Add()
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540

  # ------------------------------------------------------------------
  # Propuesta 2: regresión mensual
  # ------------------------------------------------------------------
  $slide2 = $presentation.Slides.Add(1, 12)
  Set-SlideBackground -Slide $slide2 -Color $script:Colors.White
  Add-Header -Slide $slide2 `
    -Title 'Propuesta 2: Predicción mensual de demanda' `
    -Type 'REGRESIÓN NUMÉRICA' `
    -AccentColor $script:Colors.Purple `
    -PaleAccent $script:Colors.PalePurple `
    -IconText '↗'

  Add-Panel -Slide $slide2 -Title '▰  Colecciones MongoDB' `
    -X 0.48 -Y 1.18 -W 4.22 -H 5.9
  Add-CollectionCard -Slide $slide2 -Name 'pedidos' -Fields @(
    'status'
    'createdAt'
    'items[].productId'
    'items[].requestedQuantity'
  ) -X 0.78 -Y 1.78 -W 3.62 -H 1.9 -HeaderColor $script:Colors.Blue
  Add-CollectionCard -Slide $slide2 -Name 'productos' -Fields @(
    '_id'
    'name'
  ) -X 0.78 -Y 3.92 -W 3.62 -H 1.18 -HeaderColor $script:Colors.Green
  [void](Add-RoundedBox -Slide $slide2 -X 0.78 -Y 5.4 -W 3.62 -H 1.17 `
    -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber -LineWeight 0.8)
  [void](Add-Text -Slide $slide2 -Text 'ADAPTACIÓN A MONGODB' `
    -X 0.96 -Y 5.52 -W 3.24 -H 0.22 -Size 8.4 -Color $script:Colors.Amber -Bold -Align 2)
  [void](Add-Text -Slide $slide2 `
    -Text "No existe detallepedidos: items[] está anidado en pedidos.`nRelación: items[].productId = String(productos._id)." `
    -X 0.98 -Y 5.84 -W 3.2 -H 0.58 -Size 8.2 -Color $script:Colors.Ink -Align 2)

  Add-FlowArrow -Slide $slide2 `
    -Text "TRANSFORMACIÓN`n`n1. Filtrar pedidos válidos`n2. Desanidar items[]`n3. Agrupar producto-mes`n4. Completar ceros + rezagos" `
    -X 4.89 -Y 2.08 -W 1.28 -H 2.42 -Color $script:Colors.Purple
  [void](Add-Text -Slide $slide2 `
    -Text "Estados válidos:`npending_review`nconfirmed`ncompleted" `
    -X 4.77 -Y 4.84 -W 1.52 -H 0.78 -Size 7.1 -Color $script:Colors.Muted -Bold -Align 2)

  Add-Panel -Slide $slide2 -Title '▦  Dataset / DataFrame resultante' `
    -X 6.35 -Y 1.18 -W 6.48 -H 5.9
  Add-Pill -Slide $slide2 -Text 'Histórico: una fila = producto-mes' `
    -X 6.68 -Y 1.63 -W 3.15 -H 0.29 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue -Size 7.7
  Add-Pill -Slide $slide2 -Text '288 filas sintéticas · 240 entrenables' `
    -X 10.02 -Y 1.63 -W 2.47 -H 0.29 `
    -FillColor $script:Colors.PalePurple -TextColor $script:Colors.Purple -Size 7.7

  Add-GroupBand -Slide $slide2 -Text 'IDENTIFICACIÓN / CONTROL' -X 6.68 -Y 2.03 -W 2.7 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue
  Add-GroupBand -Slide $slide2 -Text 'VARIABLES PREDICTORAS (X)' -X 9.38 -Y 2.03 -W 2.28 `
    -FillColor $script:Colors.PaleGreen -TextColor $script:Colors.Green
  Add-GroupBand -Slide $slide2 -Text 'META (Y)' -X 11.66 -Y 2.03 -W 0.84 `
    -FillColor $script:Colors.PalePurple -TextColor $script:Colors.Purple

  $demandHeaders = @(
    'product_id'
    'producto'
    'mes_objetivo'
    "demanda_`nlag_1m"
    "demanda_`nlag_2m"
    "demanda_`nlag_3m"
    "Y_unidades_`nsolicitadas_mes"
  )
  $demandRows = @(
    ,@('SYN-PROD-006', 'Lavanda', '2026-04', '55', '20', '13', '51')
    ,@('SYN-PROD-006', 'Lavanda', '2026-05', '51', '55', '20', '46')
    ,@('SYN-PROD-005', 'Eucalipto', '2026-06', '50', '26', '29', '34')
    ,@('SYN-PROD-006', 'Lavanda', '2026-06', '46', '51', '55', '55')
  )
  [void](Add-DataTable -Slide $slide2 -Headers $demandHeaders -Rows $demandRows `
    -ColumnWidths @(1.02, 0.88, 0.8, 0.76, 0.76, 0.76, 0.84) `
    -X 6.68 -Y 2.28 -W 5.82 -H 1.62 -FontSize 6.55 `
    -HeaderColor $script:Colors.DarkGreen -LastHeaderColor $script:Colors.Purple `
    -HighlightLastColumn)

  [void](Add-RoundedBox -Slide $slide2 -X 6.68 -Y 4.2 -W 5.82 -H 1.42 `
    -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber -LineWeight 1.0)
  [void](Add-Text -Slide $slide2 -Text '¿QUÉ SE VA A PREDECIR? — VARIABLE CONTINUA (Y)' `
    -X 6.96 -Y 4.34 -W 5.25 -H 0.24 -Size 9.2 -Color $script:Colors.Amber -Bold)
  [void](Add-Text -Slide $slide2 `
    -Text "Y_unidades_solicitadas_mes: total de unidades solicitadas en pedidos válidos de cada producto durante el siguiente mes calendario." `
    -X 6.96 -Y 4.73 -W 5.22 -H 0.58 -Size 10 -Color $script:Colors.Ink -Bold)
  [void](Add-Text -Slide $slide2 `
    -Text 'Ejemplos históricos del CSV sintético: Y es observada, no una predicción. El modelo base usa M−1, M−2 y M−3.' `
    -X 6.71 -Y 5.88 -W 5.72 -H 0.46 -Size 8.25 -Color $script:Colors.Muted -Align 2)
  [void](Add-Text -Slide $slide2 `
    -Text 'UTILIDAD · planear el reabastecimiento y reducir faltantes o exceso de inventario.' `
    -X 6.71 -Y 6.5 -W 5.72 -H 0.28 -Size 8.9 -Color $script:Colors.Purple -Bold -Align 2)

  $slide2Notes = @'
  Esta propuesta es regresión numérica porque la salida es una cantidad de unidades. MongoDB guarda cada pedido como un documento y sus productos dentro del arreglo items; por eso no existe una tabla detallepedidos. En Jupyter filtramos pending_review, confirmed y completed, desanidamos items, agrupamos requestedQuantity por producto y mes, completamos los meses sin solicitudes con cero y calculamos los tres rezagos. productId es texto y se relaciona con String(productos._id). Cada fila representa un producto y un mes objetivo. Las columnas de control no entran como números al modelo. Las X del modelo base son M-1, M-2 y M-3. La Y es el total solicitado en pedidos válidos durante el mes objetivo. El ejemplo de Lavanda para junio usa 46, 51 y 55 unidades anteriores, y su Y histórica observada fue 55; no es una predicción ya generada. Los datos son sintéticos y reproducibles.
'@
  Set-SpeakerNotes -Slide $slide2 -Notes $slide2Notes

  # ------------------------------------------------------------------
  # Propuesta 3: clustering RFM
  # ------------------------------------------------------------------
  $slide3 = $presentation.Slides.Add(2, 12)
  Set-SlideBackground -Slide $slide3 -Color $script:Colors.White
  Add-Header -Slide $slide3 `
    -Title 'Propuesta 3: Segmentación de clientes' `
    -Type 'CLUSTERING NO SUPERVISADO' `
    -AccentColor $script:Colors.Green `
    -PaleAccent $script:Colors.PaleGreen `
    -IconText '≋'

  Add-Panel -Slide $slide3 -Title '▰  Colecciones MongoDB' `
    -X 0.48 -Y 1.18 -W 4.22 -H 5.9
  Add-CollectionCard -Slide $slide3 -Name 'usuarios' -Fields @(
    '_id'
  ) -X 0.78 -Y 1.83 -W 3.62 -H 0.95 -HeaderColor $script:Colors.Blue
  Add-CollectionCard -Slide $slide3 -Name 'pedidos' -Fields @(
    'customerUserId'
    'status'
    'createdAt'
    'subtotal'
  ) -X 0.78 -Y 3.03 -W 3.62 -H 1.85 -HeaderColor $script:Colors.Green
  [void](Add-RoundedBox -Slide $slide3 -X 0.78 -Y 5.18 -W 3.62 -H 1.25 `
    -FillColor $script:Colors.PaleBlue -LineColor $script:Colors.Blue -LineWeight 0.8)
  [void](Add-Text -Slide $slide3 -Text 'RELACIÓN LÓGICA POR IDENTIFICADOR' `
    -X 0.96 -Y 5.31 -W 3.22 -H 0.22 -Size 8.2 -Color $script:Colors.Blue -Bold -Align 2)
  [void](Add-Text -Slide $slide3 `
    -Text "usuarios._id.toString()`n↕`npedidos.customerUserId" `
    -X 1.02 -Y 5.64 -W 3.1 -H 0.56 -Size 9.2 -Color $script:Colors.Ink -Bold -Align 2)

  Add-FlowArrow -Slide $slide3 `
    -Text "TRANSFORMACIÓN`n`n1. Filtrar completed + usuario`n2. Agrupar por cliente`n3. Calcular RFM`n4. Estandarizar" `
    -X 4.89 -Y 2.08 -W 1.28 -H 2.42 -Color $script:Colors.Green
  [void](Add-Text -Slide $slide3 -Text "Fecha de corte:`n30/06/2026" `
    -X 4.82 -Y 4.91 -W 1.42 -H 0.48 -Size 7.7 -Color $script:Colors.Muted -Bold -Align 2)

  Add-Panel -Slide $slide3 -Title '▦  Dataset / DataFrame resultante' `
    -X 6.35 -Y 1.18 -W 6.48 -H 5.9
  Add-Pill -Slide $slide3 -Text 'Vista RFM: una fila por cliente' `
    -X 6.68 -Y 1.63 -W 2.68 -H 0.29 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue -Size 7.7
  Add-Pill -Slide $slide3 -Text '300 clientes sintéticos · 3 RFM · sin Y' `
    -X 9.58 -Y 1.63 -W 2.92 -H 0.29 `
    -FillColor $script:Colors.PaleGreen -TextColor $script:Colors.Green -Size 7.7

  Add-GroupBand -Slide $slide3 -Text 'CONTROL' -X 6.68 -Y 2.03 -W 1.45 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue
  Add-GroupBand -Slide $slide3 -Text 'VARIABLES PARA AGRUPAMIENTO (X)' -X 8.13 -Y 2.03 -W 4.37 `
    -FillColor $script:Colors.PaleGreen -TextColor $script:Colors.Green

  $segmentHeaders = @('customer_key', 'recency_days', 'frequency_orders', 'monetary_value')
  $segmentRows = @(
    ,@('SYN-CUST-0001', '381', '2', '180.0')
    ,@('SYN-CUST-0003', '10', '1', '180.0')
    ,@('SYN-CUST-0005', '32', '10', '1002.0')
    ,@('SYN-CUST-0008', '14', '12', '1188.0')
  )
  [void](Add-DataTable -Slide $slide3 -Headers $segmentHeaders -Rows $segmentRows `
    -ColumnWidths @(1.45, 1.35, 1.45, 1.57) `
    -X 6.68 -Y 2.28 -W 5.82 -H 1.62 -FontSize 7.15 `
    -HeaderColor $script:Colors.DarkGreen -LastHeaderColor $script:Colors.DarkGreen)

  [void](Add-RoundedBox -Slide $slide3 -X 6.68 -Y 4.16 -W 5.82 -H 1.88 `
    -FillColor $script:Colors.PaleAmber -LineColor $script:Colors.Amber -LineWeight 1.0)
  [void](Add-Text -Slide $slide3 -Text '¿QUÉ SE ANALIZARÁ? — NO EXISTE VARIABLE Y' `
    -X 6.96 -Y 4.28 -W 5.25 -H 0.24 -Size 9.2 -Color $script:Colors.Amber -Bold)
  [void](Add-Text -Slide $slide3 `
    -Text 'K-Means agrupará clientes con comportamientos similares según recencia, frecuencia y monto.' `
    -X 6.96 -Y 4.64 -W 5.23 -H 0.42 -Size 9.8 -Color $script:Colors.Ink -Bold)
  Add-Pill -Slide $slide3 -Text 'Leales / alto valor' -X 6.96 -Y 5.2 -W 1.34 -H 0.3 `
    -FillColor $script:Colors.PaleGreen -TextColor $script:Colors.Green -Size 7.1
  Add-Pill -Slide $slide3 -Text 'Nuevos' -X 8.42 -Y 5.2 -W 0.88 -H 0.3 `
    -FillColor $script:Colors.PaleBlue -TextColor $script:Colors.Blue -Size 7.1
  Add-Pill -Slide $slide3 -Text 'Ocasionales' -X 9.42 -Y 5.2 -W 1.06 -H 0.3 `
    -FillColor $script:Colors.PalePurple -TextColor $script:Colors.Purple -Size 7.1
  Add-Pill -Slide $slide3 -Text 'En riesgo' -X 10.6 -Y 5.2 -W 0.91 -H 0.3 `
    -FillColor 0xFBEAEA -TextColor $script:Colors.Red -Size 7.1
  [void](Add-Text -Slide $slide3 `
    -Text 'Perfiles esperados; k por validar. Los nombres se asignan después; no son clases predefinidas.' `
    -X 6.94 -Y 5.61 -W 5.24 -H 0.26 -Size 7.65 -Color $script:Colors.Muted -Align 2)
  [void](Add-Text -Slide $slide3 `
    -Text 'UTILIDAD · promociones, recompensas y campañas de recuperación diferentes para cada grupo.' `
    -X 6.71 -Y 6.34 -W 5.72 -H 0.42 -Size 8.8 -Color $script:Colors.Green -Bold -Align 2)

  $slide3Notes = @'
  Esta propuesta utiliza clustering no supervisado. Usuarios aporta el identificador y pedidos aporta customerUserId, status, createdAt y subtotal. Como usuarios._id es ObjectId y customerUserId es string, la unión productiva compara usuarios._id.toString() con customerUserId. Conservamos pedidos completed que tienen usuario registrado, agrupamos por cliente y calculamos RFM. Recencia son los días desde createdAt del último pedido que actualmente está completed hasta el 30 de junio de 2026. Frecuencia es la cantidad de pedidos completed. En el CSV sintético, monto suma orders.total; en MongoDB se usará su equivalente pedidos.subtotal. customer_key solo identifica y se excluye de K-Means. Antes de agrupar aplicamos log1p y StandardScaler. No existe variable Y ni etiquetas previas: K-Means produce clústeres numéricos y después interpretamos sus promedios para nombrarlos. Los cuatro perfiles son esperados y k todavía debe validarse. Los valores mostrados proceden del dataset sintético actual.
'@
  Set-SpeakerNotes -Slide $slide3 -Notes $slide3Notes

  $presentation.SaveAs($pptxPath, 24)
  $presentation.SaveAs($pdfPath, 32)
  $slide2.Export($slide2PngPath, 'PNG', 1600, 900)
  $slide3.Export($slide3PngPath, 'PNG', 1600, 900)

  [pscustomobject]@{
    pptx = $pptxPath
    pdf = $pdfPath
    propuesta2_png = $slide2PngPath
    propuesta3_png = $slide3PngPath
    slides = 2
  } | ConvertTo-Json -Compress
}
finally {
  if ($null -ne $slide3) {
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($slide3) } catch {}
  }
  if ($null -ne $slide2) {
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($slide2) } catch {}
  }
  if ($null -ne $presentation) {
    try {
      $presentation.Saved = -1
      $presentation.Close()
    } catch {}
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) } catch {}
  }
  if ($null -ne $powerPoint) {
    if ($ownedPowerPointIds.Count -gt 0) {
      try { $powerPoint.Quit() } catch {}
    }
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerPoint) } catch {}
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  [GC]::Collect()
  foreach ($processId in $ownedPowerPointIds) {
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($null -ne $process -and $process.ProcessName -eq 'POWERPNT' -and `
      $process.MainWindowHandle -eq 0) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    }
  }
}
