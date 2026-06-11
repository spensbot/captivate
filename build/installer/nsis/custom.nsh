!include "MUI2.nsh"

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

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Captivate 2 Setup"
  !define MUI_WELCOMEPAGE_TEXT "Welcome to the Captivate 2 installer.$\r$\n$\r$\nChoose where to install Captivate 2. If optional runtimes (Visual C++ or NDI) are missing on this PC, setup may offer to install them."
  !insertmacro MUI_PAGE_WELCOME
!macroend

!macro customInstall
  SetOutPath "$PLUGINSDIR"

  ; --- Microsoft Visual C++ 2015-2022 Redistributable (x64) ---
  !insertmacro DetectVcRedist2015_2022_x64
  IntCmp $R9 1 skipVcRedist 0 skipVcRedist
  IfSilent skipVcRedist
  MessageBox MB_YESNO|MB_ICONQUESTION "Microsoft Visual C++ 2015-2022 Redistributable (x64) was not detected.$\r$\n$\r$\nInstall it now?$\r$\n$\r$\nRecommended for native streaming and runtime dependencies." IDNO skipVcRedist
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
  !insertmacro DetectNdiRuntime
  IntCmp $R9 1 skipNdiRuntime 0 skipNdiRuntime
  IfSilent skipNdiRuntime
  MessageBox MB_YESNO|MB_ICONQUESTION "NDI Runtime was not detected.$\r$\n$\r$\nInstall it now?$\r$\n$\r$\nNeeded for NDI streaming features." IDNO skipNdiRuntime
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
!macroend
