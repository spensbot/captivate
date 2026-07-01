!include "MUI2.nsh"
!include "nsDialogs.nsh"
!include "LogicLib.nsh"

Var Dialog
Var InstallVcRedist
Var InstallNdiRuntime
Var InstallProjectMRuntime
Var HwndVcRedist
Var HwndNdiRuntime
Var HwndProjectMRuntime

; Sets $R9 to 1 when VC++ 2015-2022 x64 appears installed, else 0.
!macro DetectVcRedist2015_2022_x64
  StrCpy $R9 0
  ClearErrors
  ReadRegDWORD $R0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  IfErrors vcDetectWow
  IntCmp $R0 1 vcDetectFound vcDetectWow vcDetectWow
vcDetectWow:
  ClearErrors
  ReadRegDWORD $R0 HKLM "SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  IfErrors vcDetectDll
  IntCmp $R0 1 vcDetectFound vcDetectDll vcDetectDll
vcDetectDll:
  IfFileExists "$WINDIR\System32\vcruntime140.dll" 0 vcDetectDone
  IfFileExists "$WINDIR\System32\msvcp140.dll" 0 vcDetectDone
vcDetectFound:
  StrCpy $R9 1
vcDetectDone:
!macroend

; Jump to ndiDetectFound when ${PATH} exists.
!macro NdiCheckDll PATH
  IfFileExists "${PATH}" ndiDetectFound
!macroend

; Sets $R9 to 1 when NDI runtime appears installed, else 0.
; Paths aligned with src/main/engine/visualizerStreamingRuntime.ts (getNdiRuntimeCandidatesFromSystem).
!macro DetectNdiRuntime
  StrCpy $R9 0

  ; NDI 6 Runtime
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Runtime\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Runtime\v6\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Runtime\bin\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Runtime\x64\Processing.NDI.Lib.x64.dll"

  ; NDI 6 Tools (common when only NDI Tools is installed)
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Tools\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Tools\Runtime\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Tools\v6\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 6 Tools\Router\Processing.NDI.Lib.x64.dll"

  ; NDI 5 Runtime / Tools
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 5 Runtime\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 5 Runtime\v5\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 5 Tools\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI 5 Tools\Runtime\Processing.NDI.Lib.x64.dll"

  ; Generic / legacy folder names
  !insertmacro NdiCheckDll "$PROGRAMFILES64\NDI\NDI Runtime\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES32\NDI\NDI 6 Tools\Runtime\Processing.NDI.Lib.x64.dll"
  !insertmacro NdiCheckDll "$PROGRAMFILES32\NDI\NDI 5 Tools\Runtime\Processing.NDI.Lib.x64.dll"

  ClearErrors
  ReadRegStr $R0 HKLM "SOFTWARE\NDI\NDI Runtime" "InstallPath"
  IfErrors ndiDetectReg2
  StrCmp $R0 "" ndiDetectReg2 0
  IfFileExists "$R0\Processing.NDI.Lib.x64.dll" ndiDetectFound
  IfFileExists "$R0\v6\Processing.NDI.Lib.x64.dll" ndiDetectFound
  IfFileExists "$R0\v5\Processing.NDI.Lib.x64.dll" ndiDetectFound
  IfFileExists "$R0\Runtime\Processing.NDI.Lib.x64.dll" ndiDetectFound
ndiDetectReg2:
  ClearErrors
  ReadRegStr $R0 HKLM "SOFTWARE\NDI" "InstallPath"
  IfErrors ndiDetectReg3
  StrCmp $R0 "" ndiDetectReg3 0
  IfFileExists "$R0\Processing.NDI.Lib.x64.dll" ndiDetectFound
  IfFileExists "$R0\Runtime\Processing.NDI.Lib.x64.dll" ndiDetectFound
ndiDetectReg3:
  ClearErrors
  ReadRegStr $R0 HKLM "SOFTWARE\NewTek\NDI" "InstallPath"
  IfErrors ndiDetectDone
  StrCmp $R0 "" ndiDetectDone 0
  IfFileExists "$R0\Processing.NDI.Lib.x64.dll" ndiDetectFound
  IfFileExists "$R0\Runtime\Processing.NDI.Lib.x64.dll" ndiDetectFound
  Goto ndiDetectDone

ndiDetectFound:
  StrCpy $R9 1
ndiDetectDone:
!macroend

!macro customInit
  StrCpy $InstallVcRedist "1"
  StrCpy $InstallNdiRuntime "0"
  StrCpy $InstallProjectMRuntime "1"
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Captivate 2 Setup"
  !define MUI_WELCOMEPAGE_TEXT "Welcome to the Captivate 2 installer.$\r$\n$\r$\nChoose where to install Captivate 2. On the next page you can select optional third-party components (Visual C++, NDI, projectM Visualizer)."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customPageAfterChangeDir
  Page custom captivateOptionalComponentsPage captivateOptionalComponentsLeave
!macroend

Function captivateOptionalComponentsPage
  !insertmacro DetectVcRedist2015_2022_x64
  ${If} $R9 == "1"
    StrCpy $InstallVcRedist "0"
  ${EndIf}

  !insertmacro DetectNdiRuntime
  ${If} $R9 == "1"
    StrCpy $InstallNdiRuntime "0"
  ${EndIf}

  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0u 0u 100% 24u "Select optional components to install with Captivate 2:"
  Pop $0

  ${NSD_CreateCheckbox} 0u 28u 100% 20u "Microsoft Visual C++ 2015-2022 Redistributable (x64) — recommended for native modules"
  Pop $HwndVcRedist
  ${If} $InstallVcRedist == "1"
    ${NSD_Check} $HwndVcRedist
  ${EndIf}

  ${NSD_CreateCheckbox} 0u 52u 100% 20u "NDI Runtime — required for NDI video streaming"
  Pop $HwndNdiRuntime
  ${If} $InstallNdiRuntime == "1"
    ${NSD_Check} $HwndNdiRuntime
  ${EndIf}

  ${NSD_CreateCheckbox} 0u 76u 100% 28u "projectM Visualizer runtime — Milkdrop-style visuals and presets (bundled with this installer)"
  Pop $HwndProjectMRuntime
  ${If} $InstallProjectMRuntime == "1"
    ${NSD_Check} $HwndProjectMRuntime
  ${EndIf}

  nsDialogs::Show
FunctionEnd

Function captivateOptionalComponentsLeave
  ${NSD_GetState} $HwndVcRedist $InstallVcRedist
  ${NSD_GetState} $HwndNdiRuntime $InstallNdiRuntime
  ${NSD_GetState} $HwndProjectMRuntime $InstallProjectMRuntime
FunctionEnd

!macro customInstall
  SetOutPath "$PLUGINSDIR"

  ; --- Microsoft Visual C++ 2015-2022 Redistributable (x64) ---
  IntCmp $InstallVcRedist 1 0 skipVcRedist
  !insertmacro DetectVcRedist2015_2022_x64
  IntCmp $R9 1 skipVcRedist 0 skipVcRedist
  IfSilent skipVcRedist
  DetailPrint "Downloading Microsoft Visual C++ Redistributable..."
  inetc::get /SILENT "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$PLUGINSDIR\vc_redist.x64.exe" /END
  Pop $0
  StrCmp $0 "OK" 0 vcRedistDownloadFailed
  DetailPrint "Installing Microsoft Visual C++ Redistributable..."
  ExecWait '"$PLUGINSDIR\vc_redist.x64.exe" /install /passive /norestart' $1
  DetailPrint "Microsoft Visual C++ installer exit code: $1"
  Goto skipVcRedist
vcRedistDownloadFailed:
  DetailPrint "Microsoft Visual C++ download failed ($0). Opening download page..."
  ExecShell "open" "https://aka.ms/vs/17/release/vc_redist.x64.exe"
skipVcRedist:

  ; --- NDI Runtime ---
  IntCmp $InstallNdiRuntime 1 0 skipNdiRuntime
  !insertmacro DetectNdiRuntime
  IntCmp $R9 1 skipNdiRuntime 0 skipNdiRuntime
  IfSilent skipNdiRuntime
  DetailPrint "Downloading NDI Runtime..."
  inetc::get /SILENT "https://downloads.ndi.tv/SDK/NDI_SDK/Install_NDI_Runtime.exe" "$PLUGINSDIR\Install_NDI_Runtime.exe" /END
  Pop $2
  StrCmp $2 "OK" 0 ndiRuntimeDownloadFailed
  DetailPrint "Launching NDI Runtime installer..."
  ExecWait '"$PLUGINSDIR\Install_NDI_Runtime.exe"' $3
  DetailPrint "NDI Runtime installer exit code: $3"
  Goto skipNdiRuntime
ndiRuntimeDownloadFailed:
  DetailPrint "NDI Runtime download failed ($2). Opening download page..."
  ExecShell "open" "https://ndi.video/tools/"
skipNdiRuntime:

  ; --- projectM Visualizer runtime (bundled copy to user profile) ---
  IntCmp $InstallProjectMRuntime 1 0 skipProjectMRuntime
  IfFileExists "$INSTDIR\resources\assets\projectm-runtime\*.*" 0 projectMRuntimeMissing
  ReadEnvStr $R0 APPDATA
  StrCpy $R1 "$R0\Captivate 2\projectm\projectm-runtime"
  CreateDirectory "$R0\Captivate 2\projectm"
  DetailPrint "Installing projectM Visualizer runtime to your profile..."
  ExecWait 'robocopy "$INSTDIR\resources\assets\projectm-runtime" "$R1" /E /NFL /NDL /NJH /NJS /nc /ns /np' $4
  DetailPrint "projectM runtime profile install exit code: $4"
  Goto skipProjectMRuntime
projectMRuntimeMissing:
  DetailPrint "projectM runtime was not bundled in this installer. Install it later from Visualizer settings."
skipProjectMRuntime:
!macroend
