"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var packageJsonPath = path.resolve(__dirname, "package.json");
var modulesPath = path.resolve(__dirname, "node_modules");
var lockedVersionPath = path.resolve(__dirname, "npm-shrinkwrap.json");
var lockedVersionMap = {};
var installedVersionMap = {};
var packageJsonVersionMap = {};
var getVersion = function (str) {
    if (!str)
        return "";
    if (/^(\d+\.)*\d+$/gi.test(str)) {
        return str;
    }
    var match = null;
    match = str.match(/((\d+\.)+\d+)$/gi);
    if (match && match.length) {
        return match[0];
    }
    match = str.match(/(\d+\.)+tgz$/gi);
    if (match && match.length) {
        return match[0].substr(0, match[0].length - 4);
    }
    return "";
};
var unique = function (arr) {
    if (!arr || arr.length <= 1) {
        return arr;
    }
    var newArr = arr.slice(), duplicateIdx = [], idxLength = 0;
    for (var i = 1; i < newArr.length; i++) {
        if (newArr[i] === newArr[i - 1]) {
            idxLength = duplicateIdx.push(i);
        }
    }
    if (idxLength > 0) {
        while (idxLength--) {
            newArr.splice(duplicateIdx[idxLength], 1);
        }
    }
    return newArr;
};
if (!fs.existsSync(lockedVersionPath)) {
    throw new Error("npm-shrinkwrap.json文件不存在！");
}
if (!fs.existsSync(modulesPath)) {
    throw new Error("node_modules文件夹不存在！");
}
//package.json中的所有版本号
console.log("开始分析package.json中的版本号......");
var packageJsonFileObj = JSON.parse(fs.readFileSync(packageJsonPath).toString());
[packageJsonFileObj.dependencies, packageJsonFileObj.devDependencies].forEach(function (obj) {
    if (!obj)
        return;
    Object.keys(obj).forEach(function (k) {
        if (!packageJsonVersionMap[k]) {
            packageJsonVersionMap[k] = [];
        }
        packageJsonVersionMap[k].push(getVersion(obj[k]));
    });
});
Object.keys(packageJsonVersionMap).forEach(function (k) {
    packageJsonVersionMap[k] = unique(packageJsonVersionMap[k]);
    console.log("Package.json\u4E2D\u7684\u6A21\u5757\u3010" + k + "\u3011\uFF0C\u7248\u672C\u53F7\uFF1A\u3010" + packageJsonVersionMap[k].toString() + "\u3011");
});
//锁定版本的文件
console.log("\n开始分析锁定的版本文件......");
var lockedFileObj = JSON.parse(fs.readFileSync(lockedVersionPath).toString());
var getVersionFromNode = function (currentName, currentNode) {
    if (!currentNode || !currentNode.version) {
        return;
    }
    var ver = getVersion(currentNode.version);
    if (!lockedVersionMap[currentName]) {
        lockedVersionMap[currentName] = [];
    }
    lockedVersionMap[currentName].push(ver);
    if (currentNode.dependencies) {
        Object.keys(currentNode.dependencies).forEach(function (k) {
            getVersionFromNode(k, currentNode.dependencies[k]);
        });
    }
};
Object.keys(lockedFileObj.dependencies).forEach(function (k) {
    getVersionFromNode(k, lockedFileObj.dependencies[k]);
});
Object.keys(lockedVersionMap).forEach(function (k) {
    lockedVersionMap[k] = unique(lockedVersionMap[k]);
    console.log("\u9501\u5B9A\u3010" + k + "\u3011\u6A21\u5757\uFF0C\u7248\u672C\u53F7\uFF1A\u3010" + lockedVersionMap[k].toString() + "\u3011");
});
//node_modules 文件夹中的所有版本号
console.log("\n开始遍历node_modules文件夹......");
var getInstalledVersion = function (currentFolderPath) {
    var files = [];
    try {
        files = fs.readdirSync(currentFolderPath);
    }
    catch (_a) { }
    files.forEach(function (folder) {
        var packagePath = path.resolve(currentFolderPath, folder + "/package.json");
        if (!fs.existsSync(packagePath)) {
            getInstalledVersion(path.resolve(currentFolderPath, folder));
            return;
        }
        var data = fs.readFileSync(packagePath);
        var obj = JSON.parse(data.toString());
        if (!installedVersionMap[obj.name]) {
            installedVersionMap[obj.name] = [];
        }
        installedVersionMap[obj.name].push(obj.version);
    });
};
getInstalledVersion(modulesPath);
Object.keys(installedVersionMap).forEach(function (k) {
    installedVersionMap[k] = unique(installedVersionMap[k]);
    console.log("\u5DF2\u5B89\u88C5\u3010" + k + "\u3011\u6A21\u5757\uFF0C\u7248\u672C\u53F7\uFF1A\u3010" + installedVersionMap[k].toString() + "\u3011");
});
//开始比较
console.log("\n开始比较版本号......");
Object.keys(lockedVersionMap).forEach(function (lockedKey) {
    if (!installedVersionMap[lockedKey]) {
        throw new Error("\u8BF7\u68C0\u67E5\u6A21\u5757\u3010" + lockedKey + "\u3011\u662F\u5426\u5DF2\u5B89\u88C5\uFF01");
    }
    var installedVersion = installedVersionMap[lockedKey].sort().toString();
    var lockedVersion = installedVersionMap[lockedKey].sort().toString();
    if (installedVersion !== lockedVersion) {
        throw new Error("\u6A21\u5757\u3010" + lockedKey + "\u3011\u7248\u672C\u53F7\u4E0D\u4E00\u81F4\uFF0C\u9501\u5B9A\u7684\u7248\u672C\u4E3A\uFF1A" + lockedVersion + "\uFF0C\u5DF2\u5B89\u88C5\u7684\u7248\u672C\u53F7\u4E3A\uFF1A" + installedVersion);
    }
    var packageJsonVersion = (packageJsonVersionMap[lockedKey] || [])[0];
    if (packageJsonVersion && installedVersionMap[lockedKey].indexOf(packageJsonVersion) == -1) {
        throw new Error("Package.json\u6587\u4EF6\u4E2D\u7684\u6A21\u5757\u3010" + lockedKey + "\u3011\u7248\u672C\u53F7\u4E0D\u4E00\u81F4\uFF0C\u5DF2\u5B89\u88C5\u7684\u7248\u672C\u4E3A\uFF1A" + installedVersion + "\uFF0Cpackage.json\u4E2D\u7684\u7248\u672C\u53F7\u4E3A\uFF1A" + packageJsonVersion);
    }
});
console.log("对比结束，所有模块版本号正常！");
