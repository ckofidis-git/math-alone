# Generates math-alone-offline.html — a MATH ALONE practice sheet that needs NO JavaScript.
# Works inside the iPad Files/Mail preview, where scripts are blocked.
# Run again any time for a fresh set of questions:   .\make-offline-sheet.ps1

param(
  [string]$Player1 = 'Player 1',
  [string]$Player2 = 'Player 2',
  [int]$Seed = 0
)

Add-Type -AssemblyName System.Web

$rand = if($Seed -gt 0){ New-Object System.Random($Seed) } else { New-Object System.Random }

# emoji written as numeric entities so no character-encoding guess can ever mangle them
$E = @{
  house='&#127968;'; flake='&#10052;'; bandit='&#129337;'; tick='&#9989;'; cross='&#10060;'
  star='&#11088;'; devil='&#128520;'; girl='&#128103;'; cup='&#127942;'; dash='&#128168;'
}
$TRAPS = @(
  @('&#127912;','Paint can on a rope &#8212; BONK!'),
  @('&#129482;','Icy front steps &#8212; WHOOPS!'),
  @('&#129718;','Feather blizzard &#8212; ACHOO!'),
  @('&#128663;','Toy cars on the floor &#8212; SLIP!'),
  @('&#128375;','Rubber spider drop &#8212; AAAH!'),
  @('&#128276;','Alarm bells everywhere &#8212; CLANG!'),
  @('&#127855;','Sticky honey floor &#8212; STUCK!'),
  @('&#127880;','Balloon avalanche &#8212; POP POP!'),
  @('&#129506;','Slippery socks on the stairs &#8212; WHEE!'),
  @('&#129345;','Drum kit tumble &#8212; BOOM!'),
  @('&#129508;','Soap slide in the hallway &#8212; ZOOM!'),
  @('&#129699;','Bucket on the head &#8212; CLONK!')
)
$TAUNTS = @(
  'Heh heh... that one got past you!',
  'Too easy, kid!',
  'One step closer to the door...',
  'Get the crowbar, Lanky!',
  'Nobody home, nobody home!'
)

$WAVES = @(
  @{ name='Wave 1 &#8212; Plus and Minus to 20'; kind='addsub'; max=20 },
  @{ name='Wave 2 &#8212; Plus and Minus to 100'; kind='addsub'; max=100 },
  @{ name='Wave 3 &#8212; Times 2, 5 and 10';     kind='mul'; tables=@(2,5,10) },
  @{ name='Wave 4 &#8212; Times 3, 4 and 6';      kind='mul'; tables=@(3,4,6) },
  @{ name='Wave 5 &#8212; Sharing (division)';    kind='div'; tables=@(2,3,4,5,10) },
  @{ name='Wave 6 &#8212; Bandit Boss Mix';       kind='mix'; max=100 }
)
$PER_WAVE = 8

function New-Problem($w){
  $kind = $w.kind
  if($kind -eq 'mix'){ $kind = @('addsub','mul','div')[$rand.Next(3)] }
  switch($kind){
    'addsub' {
      $m = if($w.max){ $w.max } else { 20 }
      if($rand.Next(2) -eq 0){
        $a = $rand.Next(2,$m); $b = $rand.Next(2,[Math]::Max(3,$m - $a + 1))
        return @{ text = "$a + $b"; ans = $a + $b }
      } else {
        $a = $rand.Next(5,$m); $b = $rand.Next(1,$a)
        return @{ text = "$a &#8722; $b"; ans = $a - $b }
      }
    }
    'mul' {
      $t = if($w.tables){ $w.tables } else { @(2,3,4,5,6,7,8,9,10) }
      $a = $t[$rand.Next($t.Count)]; $b = $rand.Next(2,11)
      return @{ text = "$a &#215; $b"; ans = $a * $b }
    }
    'div' {
      $t = if($w.tables){ $w.tables } else { @(2,3,4,5,10) }
      $b = $t[$rand.Next($t.Count)]; $q = $rand.Next(2,11)
      return @{ text = "$($b*$q) &#247; $b"; ans = $q }
    }
  }
}

function New-Choices($ans){
  $set = [System.Collections.Generic.List[int]]::new()
  $set.Add($ans)
  $offsets = @(1,-1,2,-2,10,-10,3,-3,5,-5)
  while($set.Count -lt 4){
    $o = $offsets[$rand.Next($offsets.Count)]
    $v = $ans + $o
    if($v -ge 0 -and -not $set.Contains($v)){ $set.Add($v) }
  }
  # shuffle
  $arr = $set.ToArray()
  for($i=$arr.Count-1; $i -gt 0; $i--){
    $j = $rand.Next($i+1); $tmp=$arr[$i]; $arr[$i]=$arr[$j]; $arr[$j]=$tmp
  }
  return $arr
}

$css = @'
<style>
  :root{
    --night:#0b1730; --gold:#ffcf5c; --snow:#eaf3ff;
    --ink:#0a1024; --green:#2fae63; --red:#e8474b;
    --p1:#7fc4ff; --p2:#ffa8d2;
  }
  *{box-sizing:border-box; -webkit-tap-highlight-color:transparent;}
  body{
    margin:0; padding:14px 14px 92px;
    font-family:"Trebuchet MS","Segoe UI",Verdana,sans-serif;
    color:var(--snow);
    background:linear-gradient(#0b1730 0%, #142c56 55%, #1d3d70 100%);
    background-attachment:fixed;
    -webkit-text-size-adjust:100%;
    counter-reset: p1hit 0 p1miss 0 p2hit 0 p2miss 0;
  }
  header{text-align:center; margin-bottom:14px;}
  h1{
    font-size:clamp(28px,7vw,54px); margin:4px 0; letter-spacing:2px; color:var(--gold);
    text-shadow:0 0 18px rgba(255,207,92,.45), 3px 3px 0 #7a3b12;
  }
  .sub{font-size:clamp(13px,3.2vw,17px); opacity:.9; margin:0 auto; max-width:34em; line-height:1.5;}
  h2{
    font-size:clamp(16px,4vw,22px); color:var(--gold); margin:26px 0 10px;
    border-bottom:2px dashed rgba(255,255,255,.25); padding-bottom:6px;
  }
  .card{
    position:relative; background:rgba(255,255,255,.08); border:2px solid rgba(255,255,255,.16);
    border-radius:16px; padding:12px 14px; margin-bottom:12px;
  }
  .card.p1{border-left:8px solid var(--p1);}
  .card.p2{border-left:8px solid var(--p2);}
  .who{font-size:12px; letter-spacing:1px; text-transform:uppercase; opacity:.75;}
  .prob{font-size:clamp(26px,7vw,40px); font-weight:bold; margin:2px 0 10px; letter-spacing:2px;}
  .choices{position:relative; display:grid; grid-template-columns:repeat(4,1fr); gap:8px;}
  .choices input{position:absolute; opacity:0; width:1px; height:1px; margin:0; pointer-events:none;}
  .choices label{
    display:block; text-align:center; padding:16px 4px; border-radius:14px; cursor:pointer;
    background:#f2f6ff; color:var(--ink); font-size:clamp(20px,5vw,26px); font-weight:bold;
    box-shadow:0 5px 0 #9fb1cd; font-variant-numeric:tabular-nums;
  }
  .choices label:active{transform:translateY(3px); box-shadow:0 2px 0 #9fb1cd;}
  .r:checked + label{background:var(--green); color:#fff; box-shadow:0 5px 0 #1c7a44;}
  .w:checked + label{background:var(--red); color:#fff; box-shadow:0 5px 0 #93272a;}
  .msg{grid-column:1 / -1; display:none; margin-top:4px; padding:10px 12px; border-radius:12px;
       font-size:clamp(15px,3.6vw,19px); font-weight:bold; line-height:1.4;}
  .r:checked ~ .msg.good{display:block; background:rgba(47,174,99,.25); border:2px solid var(--green);}
  .w:checked ~ .msg.bad{display:block; background:rgba(232,71,75,.22); border:2px solid var(--red);}
  .card.p1 .r:checked{counter-increment:p1hit;}
  .card.p1 .w:checked{counter-increment:p1miss;}
  .card.p2 .r:checked{counter-increment:p2hit;}
  .card.p2 .w:checked{counter-increment:p2miss;}
  #board{
    position:fixed; left:0; right:0; bottom:0; z-index:5;
    display:flex; gap:10px; padding:10px 12px;
    background:rgba(6,14,32,.94); border-top:2px solid rgba(255,255,255,.2);
    font-size:clamp(13px,3.4vw,17px); font-weight:bold;
  }
  #board div{flex:1; text-align:center; border-radius:12px; padding:6px 4px;}
  #board .one{background:rgba(127,196,255,.16); border:2px solid var(--p1);}
  #board .two{background:rgba(255,168,210,.16); border:2px solid var(--p2);}
  .nm{display:block; font-size:12px; opacity:.85; text-transform:uppercase; letter-spacing:1px;}
  .tally{font-size:clamp(16px,4.5vw,22px); font-variant-numeric:tabular-nums;}
  .c1h::after{content:counter(p1hit);} .c1m::after{content:counter(p1miss);}
  .c2h::after{content:counter(p2hit);} .c2m::after{content:counter(p2miss);}
  .finish{
    background:rgba(255,255,255,.10); border:2px solid var(--gold); border-radius:18px;
    padding:18px; text-align:center; margin-top:26px; font-size:clamp(15px,4vw,20px); line-height:1.6;
  }
  .finish b{color:var(--gold);}
  .hint{text-align:center; opacity:.6; font-size:13px; margin-top:14px;}
</style>
'@

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('<!DOCTYPE html>')
[void]$sb.AppendLine('<html lang="en">')
[void]$sb.AppendLine('<head>')
[void]$sb.AppendLine('<meta charset="utf-8">')
[void]$sb.AppendLine('<meta name="viewport" content="width=device-width, initial-scale=1">')
[void]$sb.AppendLine('<title>MATH ALONE &#8212; Practice Sheet</title>')
[void]$sb.AppendLine($css)
[void]$sb.AppendLine('</head>')
[void]$sb.AppendLine('<body>')
[void]$sb.AppendLine('<header>')
[void]$sb.AppendLine("<h1>MATH ALONE</h1>")
[void]$sb.AppendLine("<p class=""sub"">$($E.house) The Slush Bandits are creeping up the street. Tap the right answer to spring a trap and send them flying. Tap a wrong one and they sneak a step closer. $($E.flake)</p>")
[void]$sb.AppendLine("<p class=""sub"" style=""margin-top:8px;opacity:.7"">$($E.girl) <b>$([System.Web.HttpUtility]::HtmlEncode($Player1))</b> takes the blue questions, <b>$([System.Web.HttpUtility]::HtmlEncode($Player2))</b> takes the pink ones. Scores add up at the bottom of the screen.</p>")
[void]$sb.AppendLine('</header>')

$n = 0
foreach($w in $WAVES){
  [void]$sb.AppendLine("<h2>$($w.name)</h2>")
  for($i=0; $i -lt $PER_WAVE; $i++){
    $n++
    $who = if($n % 2 -eq 1){ 'p1' } else { 'p2' }
    $whoName = if($who -eq 'p1'){ $Player1 } else { $Player2 }
    $p = New-Problem $w
    $choices = New-Choices $p.ans
    $trap = $TRAPS[$rand.Next($TRAPS.Count)]
    $taunt = $TAUNTS[$rand.Next($TAUNTS.Count)]

    [void]$sb.AppendLine("<div class=""card $who"">")
    [void]$sb.AppendLine("  <div class=""who"">$([System.Web.HttpUtility]::HtmlEncode($whoName)) &#183; question $n</div>")
    [void]$sb.AppendLine("  <div class=""prob"">$($p.text) = ?</div>")
    [void]$sb.AppendLine('  <div class="choices">')
    $k = 0
    foreach($c in $choices){
      $k++
      $cls = if($c -eq $p.ans){ 'r' } else { 'w' }
      $id = "q${n}o${k}"
      [void]$sb.AppendLine("    <input type=""radio"" name=""q$n"" id=""$id"" class=""$cls""><label for=""$id"">$c</label>")
    }
    [void]$sb.AppendLine("    <div class=""msg good"">$($trap[0]) $($trap[1]) Trapped!</div>")
    [void]$sb.AppendLine("    <div class=""msg bad"">$($E.devil) $taunt The answer was <b>$($p.ans)</b>.</div>")
    [void]$sb.AppendLine('  </div>')
    [void]$sb.AppendLine('</div>')
  }
}

[void]$sb.AppendLine('<div class="finish">')
[void]$sb.AppendLine("$($E.cup) <b>House report</b><br>")
[void]$sb.AppendLine("$([System.Web.HttpUtility]::HtmlEncode($Player1)) trapped <b class=""c1h""></b> bandits and let <b class=""c1m""></b> slip past.<br>")
[void]$sb.AppendLine("$([System.Web.HttpUtility]::HtmlEncode($Player2)) trapped <b class=""c2h""></b> bandits and let <b class=""c2m""></b> slip past.<br>")
[void]$sb.AppendLine("<span style=""opacity:.75"">Every trap counts. Reload the page to defend the house again!</span>")
[void]$sb.AppendLine('</div>')
[void]$sb.AppendLine('<p class="hint">Tip: pull down to refresh, or close and reopen, to clear all the answers.</p>')

[void]$sb.AppendLine('<div id="board">')
[void]$sb.AppendLine("  <div class=""one""><span class=""nm"">$([System.Web.HttpUtility]::HtmlEncode($Player1))</span><span class=""tally"">$($E.tick) <span class=""c1h""></span> &#160; $($E.cross) <span class=""c1m""></span></span></div>")
[void]$sb.AppendLine("  <div class=""two""><span class=""nm"">$([System.Web.HttpUtility]::HtmlEncode($Player2))</span><span class=""tally"">$($E.tick) <span class=""c2h""></span> &#160; $($E.cross) <span class=""c2m""></span></span></div>")
[void]$sb.AppendLine('</div>')
[void]$sb.AppendLine('</body>')
[void]$sb.AppendLine('</html>')

$out = Join-Path $PSScriptRoot 'math-alone-offline.html'
[System.IO.File]::WriteAllText($out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
"Wrote $out  ($n questions)"
