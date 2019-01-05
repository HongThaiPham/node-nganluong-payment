"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _nganLuong = require("./ngan-luong");

Object.keys(_nganLuong).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _nganLuong[key];
    }
  });
});
//# sourceMappingURL=index.js.map