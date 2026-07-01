#include <napi.h>

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdlib>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <mutex>
#include <sstream>
#include <set>
#include <string>
#include <unordered_map>
#include <vector>

#ifdef _WIN32
#ifndef NOMINMAX
#define NOMINMAX
#endif
#include <windows.h>
#include <gl/GL.h>
#pragma comment(lib, "opengl32.lib")
#elif defined(__linux__)
#include <dlfcn.h>
#include <X11/Xlib.h>
#include <GL/gl.h>
#include <GL/glx.h>
#elif defined(__APPLE__)
#include <dlfcn.h>
#include <OpenGL/OpenGL.h>
#include <OpenGL/gl3.h>
#endif

namespace {

using projectm_handle = void*;
using projectm_load_proc = void* (*)(const char* name, void* user_data);

struct ProjectMApi {
  using FnCreate = projectm_handle (*)();
  using FnCreateWithLoadProc = projectm_handle (*)(projectm_load_proc, void*);
  using FnDestroy = void (*)(projectm_handle);
  using FnLoadPresetFile = void (*)(projectm_handle, const char*, bool);
  using FnPcmAddFloat = void (*)(projectm_handle, const float*, unsigned int, int);
  using FnRenderFrame = void (*)(projectm_handle);
  using FnSetWindowSize = void (*)(projectm_handle, size_t, size_t);
  using FnSetMeshSize = void (*)(projectm_handle, size_t, size_t);
  using FnSetFps = void (*)(projectm_handle, int32_t);
  using FnSetFrameTime = void (*)(projectm_handle, double);
  using FnSetPresetLocked = void (*)(projectm_handle, bool);
  using FnSetHardCutEnabled = void (*)(projectm_handle, bool);
  using FnSetPresetDuration = void (*)(projectm_handle, double);
  using FnSetSoftCutDuration = void (*)(projectm_handle, double);
  using FnSetTextureSearchPaths = void (*)(projectm_handle, const char**, size_t);
  using FnResetTextures = void (*)(projectm_handle);
  using FnGlewInit = unsigned int (*)();

#ifdef _WIN32
  HMODULE runtimeModule = nullptr;
  HMODULE opengl32Module = nullptr;
  HMODULE glewModule = nullptr;
#elif defined(__linux__) || defined(__APPLE__)
  void* runtimeModule = nullptr;
#endif
  FnCreate create = nullptr;
  FnCreateWithLoadProc createWithLoadProc = nullptr;
  FnDestroy destroy = nullptr;
  FnLoadPresetFile loadPresetFile = nullptr;
  FnPcmAddFloat pcmAddFloat = nullptr;
  FnRenderFrame renderFrame = nullptr;
  FnSetWindowSize setWindowSize = nullptr;
  FnSetMeshSize setMeshSize = nullptr;
  FnSetFps setFps = nullptr;
  FnSetFrameTime setFrameTime = nullptr;
  FnSetPresetLocked setPresetLocked = nullptr;
  FnSetHardCutEnabled setHardCutEnabled = nullptr;
  FnSetPresetDuration setPresetDuration = nullptr;
  FnSetSoftCutDuration setSoftCutDuration = nullptr;
  FnSetTextureSearchPaths setTextureSearchPaths = nullptr;
  FnResetTextures resetTextures = nullptr;
  FnGlewInit glewInit = nullptr;
  bool loaded = false;
};

ProjectMApi g_api;
std::mutex g_logMutex;
std::string g_logPath;
bool g_logEnabled = false;

std::string getBridgeLogPath() {
  if (g_logEnabled && !g_logPath.empty()) {
    return g_logPath;
  }

  const char* configured = std::getenv("CAPTIVATE_PROJECTM_BRIDGE_LOG");
  if (configured != nullptr && configured[0] != '\0') {
    g_logEnabled = true;
    g_logPath = configured;
    return g_logPath;
  }
  g_logEnabled = false;
  g_logPath.clear();
  return std::string();
}

void bridgeLog(const std::string& message) {
  std::lock_guard<std::mutex> guard(g_logMutex);
  const std::string path = getBridgeLogPath();
  if (!g_logEnabled || path.empty()) {
    return;
  }
  std::ofstream stream(path, std::ios::app);
  if (!stream.is_open()) {
    return;
  }
  stream << message << std::endl;
}

#if defined(_WIN32)
struct HiddenGlContext {
  HWND hwnd = nullptr;
  HDC hdc = nullptr;
  HGLRC hglrc = nullptr;
  int width = 0;
  int height = 0;

  bool create(int targetWidth, int targetHeight) {
    if (hwnd != nullptr) {
      return resize(targetWidth, targetHeight);
    }
    if (!registerWindowClass()) {
      return false;
    }

    width = std::max(1, targetWidth);
    height = std::max(1, targetHeight);
    hwnd = CreateWindowExW(
        0,
        kWindowClassName,
        L"Captivate projectM bridge",
        WS_POPUP,
        0,
        0,
        width,
        height,
        nullptr,
        nullptr,
        GetModuleHandleW(nullptr),
        nullptr);
    if (hwnd == nullptr) {
      return false;
    }

    hdc = GetDC(hwnd);
    if (hdc == nullptr) {
      destroy();
      return false;
    }

    PIXELFORMATDESCRIPTOR pfd;
    std::memset(&pfd, 0, sizeof(pfd));
    pfd.nSize = sizeof(pfd);
    pfd.nVersion = 1;
    pfd.dwFlags = PFD_DRAW_TO_WINDOW | PFD_SUPPORT_OPENGL | PFD_DOUBLEBUFFER;
    pfd.iPixelType = PFD_TYPE_RGBA;
    pfd.cColorBits = 32;
    pfd.cAlphaBits = 8;
    pfd.cDepthBits = 24;
    pfd.cStencilBits = 8;

    const int format = ChoosePixelFormat(hdc, &pfd);
    if (format == 0 || !SetPixelFormat(hdc, format, &pfd)) {
      destroy();
      return false;
    }

    hglrc = wglCreateContext(hdc);
    if (hglrc == nullptr) {
      destroy();
      return false;
    }

    if (!makeCurrent()) {
      destroy();
      return false;
    }

    glViewport(0, 0, width, height);
    return true;
  }

  bool resize(int targetWidth, int targetHeight) {
    if (hwnd == nullptr) {
      return false;
    }
    width = std::max(1, targetWidth);
    height = std::max(1, targetHeight);
    SetWindowPos(
        hwnd, nullptr, 0, 0, width, height, SWP_NOACTIVATE | SWP_NOMOVE | SWP_NOZORDER);
    return true;
  }

  bool makeCurrent() const {
    if (hdc == nullptr || hglrc == nullptr) {
      return false;
    }
    return wglMakeCurrent(hdc, hglrc) == TRUE;
  }

  void destroy() {
    if (hglrc != nullptr) {
      wglMakeCurrent(nullptr, nullptr);
      wglDeleteContext(hglrc);
      hglrc = nullptr;
    }
    if (hwnd != nullptr && hdc != nullptr) {
      ReleaseDC(hwnd, hdc);
      hdc = nullptr;
    }
    if (hwnd != nullptr) {
      DestroyWindow(hwnd);
      hwnd = nullptr;
    }
    width = 0;
    height = 0;
  }

 private:
  static constexpr const wchar_t* kWindowClassName = L"CaptivateProjectMBridgeHiddenWindow";

  static bool registerWindowClass() {
    static bool registered = false;
    if (registered) {
      return true;
    }

    WNDCLASSW wc;
    std::memset(&wc, 0, sizeof(wc));
    wc.style = CS_OWNDC;
    wc.lpfnWndProc = DefWindowProcW;
    wc.hInstance = GetModuleHandleW(nullptr);
    wc.lpszClassName = kWindowClassName;

    if (RegisterClassW(&wc) == 0) {
      if (GetLastError() != ERROR_CLASS_ALREADY_EXISTS) {
        return false;
      }
    }
    registered = true;
    return true;
  }
};
#elif defined(__linux__)
struct HiddenGlContext {
  Display* display = nullptr;
  Window window = 0;
  GLXContext context = nullptr;
  Colormap colormap = 0;
  int width = 0;
  int height = 0;

  bool create(int targetWidth, int targetHeight) {
    if (display != nullptr) {
      return resize(targetWidth, targetHeight);
    }

    width = std::max(1, targetWidth);
    height = std::max(1, targetHeight);

    display = XOpenDisplay(nullptr);
    if (display == nullptr) {
      return false;
    }

    int attributes[] = {GLX_RGBA, GLX_DOUBLEBUFFER, GLX_DEPTH_SIZE, 24, GLX_STENCIL_SIZE, 8, None};
    XVisualInfo* visualInfo = glXChooseVisual(display, DefaultScreen(display), attributes);
    if (visualInfo == nullptr) {
      destroy();
      return false;
    }

    colormap = XCreateColormap(display, RootWindow(display, visualInfo->screen), visualInfo->visual, AllocNone);
    XSetWindowAttributes swa;
    std::memset(&swa, 0, sizeof(swa));
    swa.colormap = colormap;
    swa.event_mask = StructureNotifyMask;
    window = XCreateWindow(
        display,
        RootWindow(display, visualInfo->screen),
        0,
        0,
        static_cast<unsigned int>(width),
        static_cast<unsigned int>(height),
        0,
        visualInfo->depth,
        InputOutput,
        visualInfo->visual,
        CWColormap | CWEventMask,
        &swa);
    if (window == 0) {
      XFree(visualInfo);
      destroy();
      return false;
    }
    XMapWindow(display, window);

    context = glXCreateContext(display, visualInfo, nullptr, True);
    XFree(visualInfo);
    if (context == nullptr) {
      destroy();
      return false;
    }

    if (!makeCurrent()) {
      destroy();
      return false;
    }

    glViewport(0, 0, width, height);
    return true;
  }

  bool resize(int targetWidth, int targetHeight) {
    if (display == nullptr || window == 0) {
      return false;
    }
    width = std::max(1, targetWidth);
    height = std::max(1, targetHeight);
    XResizeWindow(display, window, static_cast<unsigned int>(width), static_cast<unsigned int>(height));
    return true;
  }

  bool makeCurrent() const {
    if (display == nullptr || window == 0 || context == nullptr) {
      return false;
    }
    return glXMakeCurrent(display, window, context) == True;
  }

  void destroy() {
    if (display != nullptr && context != nullptr) {
      glXMakeCurrent(display, None, nullptr);
      glXDestroyContext(display, context);
      context = nullptr;
    }
    if (display != nullptr && window != 0) {
      XDestroyWindow(display, window);
      window = 0;
    }
    if (display != nullptr && colormap != 0) {
      XFreeColormap(display, colormap);
      colormap = 0;
    }
    if (display != nullptr) {
      XCloseDisplay(display);
      display = nullptr;
    }
    width = 0;
    height = 0;
  }
};
#elif defined(__APPLE__)
struct HiddenGlContext {
  CGLContextObj context = nullptr;
  CGLPixelFormatObj pixelFormat = nullptr;
  CGLPBufferObj pbuffer = nullptr;
  int width = 0;
  int height = 0;

  bool create(int targetWidth, int targetHeight) {
    if (context != nullptr) {
      return resize(targetWidth, targetHeight);
    }

    width = std::max(1, targetWidth);
    height = std::max(1, targetHeight);

    CGLPixelFormatAttribute attributes[] = {
        kCGLPFAOpenGLProfile,
        static_cast<CGLPixelFormatAttribute>(kCGLOGLPVersion_Legacy),
        kCGLPFAColorSize,
        static_cast<CGLPixelFormatAttribute>(24),
        kCGLPFAAlphaSize,
        static_cast<CGLPixelFormatAttribute>(8),
        static_cast<CGLPixelFormatAttribute>(0)};
    GLint virtualScreenCount = 0;
    CGLError error = CGLChoosePixelFormat(attributes, &pixelFormat, &virtualScreenCount);
    if (error != kCGLNoError || pixelFormat == nullptr) {
      destroy();
      return false;
    }

    error = CGLCreateContext(pixelFormat, nullptr, &context);
    if (error != kCGLNoError || context == nullptr) {
      destroy();
      return false;
    }

    error = CGLCreatePBuffer(
        static_cast<GLsizei>(width),
        static_cast<GLsizei>(height),
        GL_TEXTURE_2D,
        GL_RGBA,
        0,
        &pbuffer);
    if (error != kCGLNoError || pbuffer == nullptr) {
      destroy();
      return false;
    }

    error = CGLSetPBuffer(context, pbuffer, 0, 0, 0);
    if (error != kCGLNoError) {
      destroy();
      return false;
    }

    if (!makeCurrent()) {
      destroy();
      return false;
    }

    glViewport(0, 0, width, height);
    return true;
  }

  bool resize(int targetWidth, int targetHeight) {
    width = std::max(1, targetWidth);
    height = std::max(1, targetHeight);
    if (context == nullptr) {
      return false;
    }

    if (pbuffer != nullptr) {
      CGLDestroyPBuffer(pbuffer);
      pbuffer = nullptr;
    }
    CGLError error = CGLCreatePBuffer(
        static_cast<GLsizei>(width),
        static_cast<GLsizei>(height),
        GL_TEXTURE_2D,
        GL_RGBA,
        0,
        &pbuffer);
    if (error != kCGLNoError || pbuffer == nullptr) {
      destroy();
      return false;
    }
    error = CGLSetPBuffer(context, pbuffer, 0, 0, 0);
    if (error != kCGLNoError) {
      destroy();
      return false;
    }
    return true;
  }

  bool makeCurrent() const {
    if (context == nullptr) {
      return false;
    }
    return CGLSetCurrentContext(context) == kCGLNoError;
  }

  void destroy() {
    if (context != nullptr) {
      CGLSetCurrentContext(nullptr);
    }
    if (pbuffer != nullptr) {
      CGLDestroyPBuffer(pbuffer);
      pbuffer = nullptr;
    }
    if (context != nullptr) {
      CGLDestroyContext(context);
      context = nullptr;
    }
    if (pixelFormat != nullptr) {
      CGLDestroyPixelFormat(pixelFormat);
      pixelFormat = nullptr;
    }
    width = 0;
    height = 0;
  }
};
#endif

struct BridgeSession {
  std::string sessionId;
  int width = 0;
  int height = 0;
  int fps = 60;
  double timelineSeconds = 0.0;
  std::string lastPresetPath;
  std::string textureSearchPathKey;
  projectm_handle instance = nullptr;
  std::vector<uint8_t> frameBgra;
#if defined(_WIN32) || defined(__linux__) || defined(__APPLE__)
  HiddenGlContext gl;
#endif
};

std::unordered_map<std::string, BridgeSession> g_sessions;

std::string toLower(std::string input) {
  std::transform(input.begin(), input.end(), input.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  return input;
}

int clampInt(int value, int minValue, int maxValue) {
  return std::max(minValue, std::min(maxValue, value));
}

std::string getString(
    const Napi::Object& object,
    const char* key,
    const std::string& fallback = "") {
  if (!object.Has(key)) {
    return fallback;
  }
  const Napi::Value value = object.Get(key);
  if (!value.IsString()) {
    return fallback;
  }
  return value.As<Napi::String>().Utf8Value();
}

int32_t getInt(const Napi::Object& object, const char* key, int32_t fallback) {
  if (!object.Has(key)) {
    return fallback;
  }
  const Napi::Value value = object.Get(key);
  if (!value.IsNumber()) {
    return fallback;
  }
  return value.As<Napi::Number>().Int32Value();
}

double getNumber(const Napi::Object& object, const char* key, double fallback) {
  if (!object.Has(key)) {
    return fallback;
  }
  const Napi::Value value = object.Get(key);
  if (!value.IsNumber()) {
    return fallback;
  }
  return value.As<Napi::Number>().DoubleValue();
}

std::vector<float> getSamples(const Napi::Object& object, const char* key) {
  if (!object.Has(key)) {
    return {};
  }
  Napi::Value value = object.Get(key);
  if (value.IsTypedArray()) {
    Napi::TypedArray typed = value.As<Napi::TypedArray>();
    if (typed.TypedArrayType() == napi_float32_array) {
      Napi::Float32Array arr = value.As<Napi::Float32Array>();
      std::vector<float> result(arr.ElementLength());
      for (size_t i = 0; i < result.size(); i++) {
        result[i] = arr[i];
      }
      return result;
    }
  }
  if (!value.IsArray()) {
    return {};
  }
  Napi::Array arr = value.As<Napi::Array>();
  std::vector<float> result;
  result.reserve(arr.Length());
  for (uint32_t i = 0; i < arr.Length(); i++) {
    Napi::Value item = arr.Get(i);
    if (!item.IsNumber()) {
      continue;
    }
    result.push_back(item.As<Napi::Number>().FloatValue());
  }
  return result;
}

bool looksLikePresetPath(const std::string& preset) {
  if (preset.empty()) {
    return false;
  }
  const std::string lowered = toLower(preset);
  if (lowered.find("://") != std::string::npos) {
    return true;
  }
  if (lowered.find(".milk") != std::string::npos ||
      lowered.find(".prjm") != std::string::npos ||
      lowered.find(".preset") != std::string::npos ||
      lowered.find(".txt") != std::string::npos) {
    return true;
  }
  // Accept local file paths with any filename extension.
  const size_t slash = std::max(preset.rfind('/'), preset.rfind('\\'));
  const size_t dot = preset.rfind('.');
  return dot != std::string::npos && dot > slash && dot + 1 < preset.size();
}

std::string trimWhitespace(const std::string& input) {
  size_t start = 0;
  while (start < input.size() && std::isspace(static_cast<unsigned char>(input[start]))) {
    start++;
  }
  size_t end = input.size();
  while (end > start && std::isspace(static_cast<unsigned char>(input[end - 1]))) {
    end--;
  }
  return input.substr(start, end - start);
}

bool looksLikeUrl(const std::string& input) {
  return toLower(input).find("://") != std::string::npos;
}

std::string dirnameFromPath(const std::string& path) {
  if (path.empty() || looksLikeUrl(path)) {
    return "";
  }
  size_t end = path.size();
  while (end > 0 && (path[end - 1] == '/' || path[end - 1] == '\\')) {
    end--;
  }
  if (end == 0) {
    return "";
  }
  const size_t slash = path.rfind('/', end - 1);
  const size_t backslash = path.rfind('\\', end - 1);
  const size_t index = slash == std::string::npos
                           ? backslash
                           : (backslash == std::string::npos ? slash : std::max(slash, backslash));
  if (index == std::string::npos || index == 0) {
    return "";
  }
  return path.substr(0, index);
}

std::vector<std::string> parseTexturePathList(const std::string& texturePath) {
  std::vector<std::string> paths;
  if (texturePath.empty()) {
    return paths;
  }
  std::string token;
  token.reserve(texturePath.size());
  auto flush = [&]() {
    const std::string trimmed = trimWhitespace(token);
    if (!trimmed.empty()) {
      paths.push_back(trimmed);
    }
    token.clear();
  };

  for (char c : texturePath) {
    if (c == ';' || c == '\n' || c == '\r') {
      flush();
    } else {
      token.push_back(c);
    }
  }
  flush();
  return paths;
}

std::string appendPathChild(const std::string& base, const char* child) {
  if (base.empty() || child == nullptr || child[0] == '\0') {
    return base;
  }
  const bool useBackslash = base.find('\\') != std::string::npos;
  const char sep = useBackslash ? '\\' : '/';
  if (base.back() == '\\' || base.back() == '/') {
    return base + child;
  }
  return base + sep + child;
}

std::vector<std::string> buildTextureSearchPaths(
    const std::string& presetPath,
    const std::string& texturePath) {
  std::set<std::string> dedup;
  std::vector<std::string> ordered;
  auto addPath = [&](const std::string& input) {
    const std::string value = trimWhitespace(input);
    if (value.empty()) {
      return;
    }
    if (dedup.insert(value).second) {
      ordered.push_back(value);
    }
  };

  for (const std::string& entry : parseTexturePathList(texturePath)) {
    addPath(entry);
  }

  const std::string presetDir = dirnameFromPath(presetPath);
  if (!presetDir.empty()) {
    addPath(presetDir);
    addPath(appendPathChild(presetDir, "textures"));
    addPath(appendPathChild(presetDir, "Textures"));
    const std::string parentDir = dirnameFromPath(presetDir);
    if (!parentDir.empty() && parentDir != presetDir) {
      addPath(parentDir);
      addPath(appendPathChild(parentDir, "textures"));
      addPath(appendPathChild(parentDir, "Textures"));
    }
  }
  return ordered;
}

bool applySessionPreset(
    BridgeSession& session,
    const std::string& presetPath,
    const std::string& texturePath,
    const char* logPrefix) {
  if (session.instance == nullptr) {
    bridgeLog(std::string(logPrefix) + ":instance-missing");
    return false;
  }
  if (!session.gl.makeCurrent()) {
    bridgeLog(std::string(logPrefix) + ":gl-make-current-failed");
    return false;
  }

  const std::vector<std::string> texturePaths =
      buildTextureSearchPaths(presetPath, texturePath);
  std::string textureKey;
  textureKey.reserve(texturePaths.size() * 64);
  for (const std::string& entry : texturePaths) {
    textureKey.append(entry);
    textureKey.push_back('\n');
  }

  if (
      g_api.setTextureSearchPaths != nullptr &&
      !texturePaths.empty() &&
      textureKey != session.textureSearchPathKey) {
    std::vector<const char*> pathPointers;
    pathPointers.reserve(texturePaths.size());
    for (const std::string& pathEntry : texturePaths) {
      pathPointers.push_back(pathEntry.c_str());
    }
    bridgeLog(
        std::string(logPrefix) + ":set-texture-search-paths:count=" +
        std::to_string(pathPointers.size()));
    bridgeLog(std::string(logPrefix) + ":set-texture-search-paths:call");
    g_api.setTextureSearchPaths(
        session.instance, pathPointers.data(), pathPointers.size());
    bridgeLog(std::string(logPrefix) + ":set-texture-search-paths:return");
    session.textureSearchPathKey = textureKey;
  }

  if (presetPath.empty()) {
    return true;
  }

  if (!looksLikePresetPath(presetPath)) {
    bridgeLog(
        std::string(logPrefix) + ":skip-preset-unrecognized-path:" + presetPath);
    return false;
  }

  if (
      g_api.loadPresetFile != nullptr &&
      presetPath != session.lastPresetPath) {
    bridgeLog(std::string(logPrefix) + ":load-preset:" + presetPath);
    g_api.loadPresetFile(session.instance, presetPath.c_str(), false);
    session.lastPresetPath = presetPath;
  }

  return true;
}

std::string toBase64(const uint8_t* data, size_t length) {
  static const char alphabet[] =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string output;
  output.reserve(((length + 2) / 3) * 4);

  size_t index = 0;
  while (index + 2 < length) {
    const uint32_t triple = (static_cast<uint32_t>(data[index]) << 16) |
                            (static_cast<uint32_t>(data[index + 1]) << 8) |
                            static_cast<uint32_t>(data[index + 2]);
    output.push_back(alphabet[(triple >> 18) & 0x3F]);
    output.push_back(alphabet[(triple >> 12) & 0x3F]);
    output.push_back(alphabet[(triple >> 6) & 0x3F]);
    output.push_back(alphabet[triple & 0x3F]);
    index += 3;
  }

  const size_t remaining = length - index;
  if (remaining == 1) {
    const uint32_t triple = (static_cast<uint32_t>(data[index]) << 16);
    output.push_back(alphabet[(triple >> 18) & 0x3F]);
    output.push_back(alphabet[(triple >> 12) & 0x3F]);
    output.push_back('=');
    output.push_back('=');
  } else if (remaining == 2) {
    const uint32_t triple =
        (static_cast<uint32_t>(data[index]) << 16) |
        (static_cast<uint32_t>(data[index + 1]) << 8);
    output.push_back(alphabet[(triple >> 18) & 0x3F]);
    output.push_back(alphabet[(triple >> 12) & 0x3F]);
    output.push_back(alphabet[(triple >> 6) & 0x3F]);
    output.push_back('=');
  }

  return output;
}

void flipBgraRows(std::vector<uint8_t>& image, int width, int height) {
  if (width <= 0 || height <= 1) {
    return;
  }
  const size_t rowBytes = static_cast<size_t>(width) * 4;
  std::vector<uint8_t> temp(rowBytes);
  for (int y = 0; y < height / 2; y++) {
    const size_t top = static_cast<size_t>(y) * rowBytes;
    const size_t bottom = static_cast<size_t>(height - 1 - y) * rowBytes;
    std::memcpy(temp.data(), image.data() + top, rowBytes);
    std::memcpy(image.data() + top, image.data() + bottom, rowBytes);
    std::memcpy(image.data() + bottom, temp.data(), rowBytes);
  }
}

void destroySession(BridgeSession& session) {
#if defined(_WIN32) || defined(__linux__) || defined(__APPLE__)
  if (session.gl.makeCurrent() && session.instance != nullptr && g_api.destroy != nullptr) {
    g_api.destroy(session.instance);
    session.instance = nullptr;
  } else if (session.instance != nullptr && g_api.destroy != nullptr) {
    g_api.destroy(session.instance);
    session.instance = nullptr;
  }
  session.gl.destroy();
#else
  if (session.instance != nullptr && g_api.destroy != nullptr) {
    g_api.destroy(session.instance);
    session.instance = nullptr;
  }
#endif
  session.frameBgra.clear();
}

void cleanupAllSessions() {
  for (auto& entry : g_sessions) {
    destroySession(entry.second);
  }
  g_sessions.clear();
}

void* resolveOpenGLProc(const char* name, void* user_data) {
#ifdef _WIN32
  if (name == nullptr) {
    return nullptr;
  }
  PROC ptr = wglGetProcAddress(name);
  if (ptr != nullptr && ptr != reinterpret_cast<PROC>(1) && ptr != reinterpret_cast<PROC>(2) &&
      ptr != reinterpret_cast<PROC>(3) && ptr != reinterpret_cast<PROC>(-1)) {
    return reinterpret_cast<void*>(ptr);
  }
  HMODULE openglModule = static_cast<HMODULE>(user_data);
  if (openglModule == nullptr) {
    return nullptr;
  }
  FARPROC fallback = GetProcAddress(openglModule, name);
  return reinterpret_cast<void*>(fallback);
#else
  (void)name;
  (void)user_data;
  return nullptr;
#endif
}

template <typename ModuleType, typename T>
T resolveSymbol(ModuleType module, const char* name) {
#ifdef _WIN32
  return reinterpret_cast<T>(GetProcAddress(module, name));
#else
  return reinterpret_cast<T>(dlsym(module, name));
#endif
}

bool loadProjectMApi() {
  bridgeLog("loadProjectMApi:begin");
  if (g_api.loaded) {
    bridgeLog("loadProjectMApi:already-loaded");
    return true;
  }

#ifdef _WIN32
  auto tryLoadRuntime = [](const char* value) -> HMODULE {
    if (value == nullptr || value[0] == '\0') {
      return nullptr;
    }
    return LoadLibraryA(value);
  };
#else
  auto tryLoadRuntime = [](const char* value) -> void* {
    if (value == nullptr || value[0] == '\0') {
      return nullptr;
    }
    return dlopen(value, RTLD_NOW | RTLD_LOCAL);
  };
#endif

#ifdef _WIN32
  HMODULE runtime = nullptr;
#else
  void* runtime = nullptr;
#endif
  const char* configuredRuntime = std::getenv("CAPTIVATE_PROJECTM_RUNTIME_PATH");
  if (configuredRuntime != nullptr && configuredRuntime[0] != '\0') {
    bridgeLog(std::string("loadProjectMApi:configured-runtime=") + configuredRuntime);
    runtime = tryLoadRuntime(configuredRuntime);
    if (runtime == nullptr) {
      std::string base(configuredRuntime);
      if (!base.empty() && base.back() != '\\' && base.back() != '/') {
        base.push_back(
#ifdef _WIN32
            '\\'
#else
            '/'
#endif
        );
      }
#ifdef _WIN32
      runtime = tryLoadRuntime((base + "projectM.dll").c_str());
      if (runtime == nullptr) runtime = tryLoadRuntime((base + "libprojectM.dll").c_str());
      if (runtime == nullptr) runtime = tryLoadRuntime((base + "projectM-4.dll").c_str());
      if (runtime == nullptr) runtime = tryLoadRuntime((base + "libprojectM-4.dll").c_str());
#elif defined(__APPLE__)
      runtime = tryLoadRuntime((base + "libprojectM.dylib").c_str());
      if (runtime == nullptr) runtime = tryLoadRuntime((base + "libprojectM-4.dylib").c_str());
#else
      runtime = tryLoadRuntime((base + "libprojectM.so").c_str());
      if (runtime == nullptr) runtime = tryLoadRuntime((base + "libprojectM.so.4").c_str());
      if (runtime == nullptr) runtime = tryLoadRuntime((base + "libprojectM-4.so").c_str());
#endif
    }
  }

  if (runtime == nullptr) {
#ifdef _WIN32
    runtime = tryLoadRuntime("projectM.dll");
    if (runtime == nullptr) runtime = tryLoadRuntime("libprojectM.dll");
    if (runtime == nullptr) runtime = tryLoadRuntime("projectM-4.dll");
    if (runtime == nullptr) runtime = tryLoadRuntime("libprojectM-4.dll");
#elif defined(__APPLE__)
    runtime = tryLoadRuntime("libprojectM.dylib");
    if (runtime == nullptr) runtime = tryLoadRuntime("libprojectM-4.dylib");
#else
    runtime = tryLoadRuntime("libprojectM.so");
    if (runtime == nullptr) runtime = tryLoadRuntime("libprojectM.so.4");
    if (runtime == nullptr) runtime = tryLoadRuntime("libprojectM-4.so");
#endif
  }
  if (runtime == nullptr) {
    bridgeLog("loadProjectMApi:runtime-load-failed");
    return false;
  }
  bridgeLog("loadProjectMApi:runtime-loaded");

  g_api.runtimeModule = runtime;
#ifdef _WIN32
  g_api.opengl32Module = LoadLibraryA("opengl32.dll");
  if (g_api.opengl32Module == nullptr) {
    bridgeLog("loadProjectMApi:opengl32-load-failed");
    FreeLibrary(g_api.runtimeModule);
    g_api.runtimeModule = nullptr;
    return false;
  }
  bridgeLog("loadProjectMApi:opengl32-loaded");
  g_api.glewModule = LoadLibraryA("glew32.dll");
  if (g_api.glewModule != nullptr) {
    bridgeLog("loadProjectMApi:glew32-loaded");
  } else {
    bridgeLog("loadProjectMApi:glew32-not-loaded");
  }
#endif

  g_api.create = resolveSymbol<decltype(runtime), ProjectMApi::FnCreate>(runtime, "projectm_create");
  g_api.createWithLoadProc = resolveSymbol<decltype(runtime), ProjectMApi::FnCreateWithLoadProc>(
      runtime, "projectm_create_with_opengl_load_proc");
  g_api.destroy = resolveSymbol<decltype(runtime), ProjectMApi::FnDestroy>(runtime, "projectm_destroy");
  g_api.loadPresetFile = resolveSymbol<decltype(runtime), ProjectMApi::FnLoadPresetFile>(
      runtime, "projectm_load_preset_file");
  g_api.pcmAddFloat = resolveSymbol<decltype(runtime), ProjectMApi::FnPcmAddFloat>(
      runtime, "projectm_pcm_add_float");
  g_api.renderFrame = resolveSymbol<decltype(runtime), ProjectMApi::FnRenderFrame>(
      runtime, "projectm_opengl_render_frame");
  g_api.setWindowSize = resolveSymbol<decltype(runtime), ProjectMApi::FnSetWindowSize>(
      runtime, "projectm_set_window_size");
  g_api.setMeshSize = resolveSymbol<decltype(runtime), ProjectMApi::FnSetMeshSize>(
      runtime, "projectm_set_mesh_size");
  g_api.setFps = resolveSymbol<decltype(runtime), ProjectMApi::FnSetFps>(runtime, "projectm_set_fps");
  g_api.setFrameTime = resolveSymbol<decltype(runtime), ProjectMApi::FnSetFrameTime>(
      runtime, "projectm_set_frame_time");
  g_api.setPresetLocked = resolveSymbol<decltype(runtime), ProjectMApi::FnSetPresetLocked>(
      runtime, "projectm_set_preset_locked");
  g_api.setHardCutEnabled = resolveSymbol<decltype(runtime), ProjectMApi::FnSetHardCutEnabled>(
      runtime, "projectm_set_hard_cut_enabled");
  g_api.setPresetDuration = resolveSymbol<decltype(runtime), ProjectMApi::FnSetPresetDuration>(
      runtime, "projectm_set_preset_duration");
  g_api.setSoftCutDuration = resolveSymbol<decltype(runtime), ProjectMApi::FnSetSoftCutDuration>(
      runtime, "projectm_set_soft_cut_duration");
  g_api.setTextureSearchPaths = resolveSymbol<decltype(runtime), ProjectMApi::FnSetTextureSearchPaths>(
      runtime, "projectm_set_texture_search_paths");
  g_api.resetTextures = resolveSymbol<decltype(runtime), ProjectMApi::FnResetTextures>(
      runtime, "projectm_reset_textures");
#ifdef _WIN32
  if (g_api.glewModule != nullptr) {
    g_api.glewInit = resolveSymbol<decltype(g_api.glewModule), ProjectMApi::FnGlewInit>(g_api.glewModule, "glewInit");
  }
#endif

  const bool requiredOk = g_api.create != nullptr && g_api.destroy != nullptr &&
                          g_api.pcmAddFloat != nullptr && g_api.renderFrame != nullptr &&
                          g_api.setWindowSize != nullptr;
  if (!requiredOk) {
    bridgeLog("loadProjectMApi:required-symbol-missing");
#ifdef _WIN32
    if (g_api.opengl32Module != nullptr) {
      FreeLibrary(g_api.opengl32Module);
      g_api.opengl32Module = nullptr;
    }
    if (g_api.runtimeModule != nullptr) {
      FreeLibrary(g_api.runtimeModule);
      g_api.runtimeModule = nullptr;
    }
    if (g_api.glewModule != nullptr) {
      FreeLibrary(g_api.glewModule);
      g_api.glewModule = nullptr;
    }
#else
    if (g_api.runtimeModule != nullptr) {
      dlclose(g_api.runtimeModule);
      g_api.runtimeModule = nullptr;
    }
#endif
    return false;
  }

  g_api.loaded = true;
  bridgeLog("loadProjectMApi:success");
  return true;
}

Napi::Value CreateSession(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsObject()) {
    return Napi::Boolean::New(env, false);
  }

  bridgeLog("createSession:begin");
  if (!loadProjectMApi()) {
    bridgeLog("createSession:load-api-failed");
    return Napi::Boolean::New(env, false);
  }

  Napi::Object request = info[0].As<Napi::Object>();
  const std::string sessionId = getString(request, "sessionId");
  if (sessionId.empty()) {
    bridgeLog("createSession:missing-session-id");
    return Napi::Boolean::New(env, false);
  }

  const int width = clampInt(getInt(request, "width", 1280), 16, 3840);
  const int height = clampInt(getInt(request, "height", 720), 16, 2160);
  const int fps = clampInt(getInt(request, "fps", 60), 1, 240);
  const std::string presetPath = getString(request, "presetPath", "");
  const std::string texturePath = getString(request, "texturePath", "");

  auto existing = g_sessions.find(sessionId);
  if (existing != g_sessions.end()) {
    destroySession(existing->second);
    g_sessions.erase(existing);
  }

  BridgeSession session;
  session.sessionId = sessionId;
  session.width = width;
  session.height = height;
  session.fps = fps;
  session.timelineSeconds = 0;
  session.frameBgra.resize(static_cast<size_t>(width) * static_cast<size_t>(height) * 4);
  bridgeLog("createSession:gl-create");

  if (!session.gl.create(width, height) || !session.gl.makeCurrent()) {
    bridgeLog("createSession:gl-create-failed");
    return Napi::Boolean::New(env, false);
  }
  bridgeLog("createSession:gl-ready");
  if (g_api.glewInit != nullptr) {
    bridgeLog("createSession:glew-init-call");
    const unsigned int glewResult = g_api.glewInit();
    bridgeLog(std::string("createSession:glew-init-result:") + std::to_string(glewResult));
    if (glewResult != 0) {
      session.gl.destroy();
      return Napi::Boolean::New(env, false);
    }
  }

  if (g_api.createWithLoadProc != nullptr
#ifdef _WIN32
      && g_api.opengl32Module != nullptr
#endif
  ) {
    bridgeLog("createSession:projectm-create-with-load-proc-call");
    session.instance = g_api.createWithLoadProc(
#ifdef _WIN32
        resolveOpenGLProc, g_api.opengl32Module
#else
        nullptr, nullptr
#endif
    );
    bridgeLog("createSession:projectm-create-with-load-proc-return");
  }
  if (session.instance == nullptr && g_api.create != nullptr) {
    bridgeLog("createSession:projectm-create-call");
    session.instance = g_api.create();
    bridgeLog("createSession:projectm-create-return");
  }
  if (session.instance == nullptr) {
    bridgeLog("createSession:projectm-instance-null");
    session.gl.destroy();
    return Napi::Boolean::New(env, false);
  }

  bridgeLog("createSession:set-window-size");
  g_api.setWindowSize(session.instance, static_cast<size_t>(width), static_cast<size_t>(height));
  if (g_api.setMeshSize != nullptr) {
    bridgeLog("createSession:set-mesh-size");
    g_api.setMeshSize(session.instance, 40, 30);
  }
  if (g_api.setFps != nullptr) {
    bridgeLog("createSession:set-fps");
    g_api.setFps(session.instance, fps);
  }
  if (g_api.setPresetLocked != nullptr) {
    bridgeLog("createSession:set-preset-locked");
    g_api.setPresetLocked(session.instance, true);
  }
  if (g_api.setHardCutEnabled != nullptr) {
    bridgeLog("createSession:set-hard-cut");
    g_api.setHardCutEnabled(session.instance, false);
  }
  if (g_api.setPresetDuration != nullptr) {
    bridgeLog("createSession:set-preset-duration");
    g_api.setPresetDuration(session.instance, 120.0);
  }
  if (g_api.setSoftCutDuration != nullptr) {
    bridgeLog("createSession:set-soft-cut-duration");
    g_api.setSoftCutDuration(session.instance, 0.2);
  }
  if (g_api.setFrameTime != nullptr) {
    bridgeLog("createSession:set-frame-time");
    g_api.setFrameTime(session.instance, session.timelineSeconds);
  }

  if (!applySessionPreset(session, presetPath, texturePath, "createSession")) {
    destroySession(session);
    return Napi::Boolean::New(env, false);
  }

  g_sessions.emplace(sessionId, std::move(session));
  bridgeLog("createSession:success");
  return Napi::Boolean::New(env, true);
}

Napi::Value LoadPreset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsObject()) {
    return Napi::Boolean::New(env, false);
  }
  if (!loadProjectMApi()) {
    return Napi::Boolean::New(env, false);
  }

  Napi::Object request = info[0].As<Napi::Object>();
  const std::string sessionId = getString(request, "sessionId");
  if (sessionId.empty()) {
    bridgeLog("loadPreset:missing-session-id");
    return Napi::Boolean::New(env, false);
  }
  auto it = g_sessions.find(sessionId);
  if (it == g_sessions.end()) {
    bridgeLog("loadPreset:session-not-found");
    return Napi::Boolean::New(env, false);
  }

  const std::string presetPath = getString(request, "presetPath", "");
  const std::string texturePath = getString(request, "texturePath", "");
  const bool ok = applySessionPreset(it->second, presetPath, texturePath, "loadPreset");
  if (!ok) {
    return Napi::Boolean::New(env, false);
  }
  bridgeLog("loadPreset:success");
  return Napi::Boolean::New(env, true);
}

Napi::Value PushAudio(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsObject()) {
    return env.Null();
  }

  Napi::Object chunk = info[0].As<Napi::Object>();
  const std::string sessionId = getString(chunk, "sessionId");
  if (sessionId.empty()) {
    return env.Null();
  }

  auto it = g_sessions.find(sessionId);
  if (it == g_sessions.end()) {
    return env.Null();
  }
  BridgeSession& session = it->second;
  if (session.instance == nullptr || g_api.pcmAddFloat == nullptr) {
    return env.Null();
  }

  int channels = clampInt(getInt(chunk, "channels", 1), 1, 2);
  std::vector<float> samples = getSamples(chunk, "samples");
  if (samples.empty()) {
    return env.Null();
  }

  for (float& sample : samples) {
    if (!std::isfinite(sample)) {
      sample = 0.0f;
    } else {
      sample = std::max(-1.0f, std::min(1.0f, sample));
    }
  }

  if (!session.gl.makeCurrent()) {
    return env.Null();
  }
  const unsigned int countPerChannel =
      channels > 1 ? static_cast<unsigned int>(samples.size() / static_cast<size_t>(channels))
                   : static_cast<unsigned int>(samples.size());
  if (countPerChannel == 0) {
    return env.Null();
  }

  g_api.pcmAddFloat(session.instance, samples.data(), countPerChannel, channels);
  return env.Null();
}

Napi::Value Render(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsObject()) {
    return env.Null();
  }

  Napi::Object request = info[0].As<Napi::Object>();
  const std::string sessionId = getString(request, "sessionId");
  if (sessionId.empty()) {
    return env.Null();
  }
  auto it = g_sessions.find(sessionId);
  if (it == g_sessions.end()) {
    return env.Null();
  }

  BridgeSession& session = it->second;
  if (session.instance == nullptr || g_api.renderFrame == nullptr) {
    return env.Null();
  }
  if (!session.gl.makeCurrent()) {
    return env.Null();
  }

  const double frameTimeMs = std::max(0.0, getNumber(request, "frameTimeMs", 16.0));
  const double dtSeconds = std::max(0.0001, std::min(0.2, frameTimeMs / 1000.0));
  session.timelineSeconds += dtSeconds;

  if (g_api.setFrameTime != nullptr) {
    g_api.setFrameTime(session.instance, session.timelineSeconds);
  }
  g_api.renderFrame(session.instance);

#ifndef GL_BGRA
#define GL_BGRA 0x80E1
#endif
#ifdef __APPLE__
  glReadBuffer(GL_FRONT);
#else
  glReadBuffer(GL_BACK);
#endif
  glPixelStorei(GL_PACK_ALIGNMENT, 1);

  const size_t requiredBytes =
      static_cast<size_t>(session.width) * static_cast<size_t>(session.height) * 4;
  if (session.frameBgra.size() != requiredBytes) {
    session.frameBgra.resize(requiredBytes);
  }
  glReadPixels(
      0,
      0,
      session.width,
      session.height,
      GL_BGRA,
      GL_UNSIGNED_BYTE,
      session.frameBgra.data());

  flipBgraRows(session.frameBgra, session.width, session.height);
  return Napi::Buffer<uint8_t>::Copy(
      env, session.frameBgra.data(), session.frameBgra.size());
}

Napi::Value DestroySession(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    return env.Null();
  }
  const std::string sessionId = info[0].As<Napi::String>().Utf8Value();
  auto it = g_sessions.find(sessionId);
  if (it != g_sessions.end()) {
    destroySession(it->second);
    g_sessions.erase(it);
  }
  return env.Null();
}

Napi::Value GetSupportedTransports(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::Array arr = Napi::Array::New(env, 1);
  arr.Set(uint32_t(0), Napi::String::New(env, "bgra-buffer"));
  return arr;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  env.AddCleanupHook(cleanupAllSessions);
  exports.Set("createSession", Napi::Function::New(env, CreateSession));
  exports.Set("loadPreset", Napi::Function::New(env, LoadPreset));
  exports.Set("pushAudio", Napi::Function::New(env, PushAudio));
  exports.Set("render", Napi::Function::New(env, Render));
  exports.Set("destroySession", Napi::Function::New(env, DestroySession));
  exports.Set(
      "getSupportedTransports",
      Napi::Function::New(env, GetSupportedTransports));
  return exports;
}

}  // namespace

NODE_API_MODULE(projectm_bridge, Init)
