{
  "targets": [
    {
      "target_name": "projectm_bridge",
      "sources": [ "src/projectm_bridge.cc" ],
      "include_dirs": [
        "<(module_root_dir)/../../node_modules/node-addon-api"
      ],
      "defines": [ "NAPI_CPP_EXCEPTIONS" ],
      "conditions": [
        [
          "OS!='win'",
          {
            "cflags_cc": [ "-std=c++17", "-fexceptions" ]
          }
        ],
        [
          "OS=='win'",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1,
                "MultiProcessorCompilation": "false",
                "AdditionalOptions": [
                  "/EHsc",
                  "/std:c++17",
                  "/Zc:__cplusplus"
                ]
              }
            }
          }
        ],
        [
          "OS=='linux'",
          {
            "link_settings": {
              "libraries": [ "-lGL", "-lX11", "-ldl" ]
            }
          }
        ],
        [
          "OS=='mac'",
          {
            "xcode_settings": {
              "OTHER_CPLUSPLUSFLAGS": [ "-std=c++17", "-fexceptions" ]
            },
            "link_settings": {
              "libraries": [ "-framework OpenGL", "-framework Cocoa", "-ldl" ]
            }
          }
        ]
      ]
    }
  ]
}
