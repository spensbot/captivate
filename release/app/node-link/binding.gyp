{
  'targets': [
    {
      'target_name': 'node-link-native',
      'sources': ['src/node_link.cc'],
      'conditions': [
        ['OS=="linux"', {'defines': ['LINK_PLATFORM_LINUX=1']}],
        ['OS=="win"', {'defines': ['LINK_PLATFORM_WINDOWS=1']}],
        ['OS=="mac"', {'defines': ['LINK_PLATFORM_MACOSX=1']}],
      ],
      'include_dirs': [
        # "<!@(node -p \"require('node-addon-api').include\")",
        "<!@(node -p \"require('node-addon-api').include\")",
        "<!(node -p \"require('node-addon-api').include_dir\")",
        "lib/link/include",
        "lib/link/modules/asio-standalone/asio/include"
      ],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7',
        'GCC_ENABLE_CPP_RTTI': 'YES'
      },
      'msvs_settings': {
        'VCCLCompilerTool': { 'ExceptionHandling': 1 },
      }
    }
  ]
}