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
var invalidModulesNameReg = /@.+@/;
var semverReg = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/ig; //https://github.com/sindresorhus/semver-regex
var packageJsonPath = path.resolve("./package.json");
var modulesPath = path.resolve("./node_modules");
var lockedVersionPath = path.resolve("./npm-shrinkwrap.json");
var lockedVersionMap = {};
var installedVersionMap = {};
var packageJsonVersionMap = {};
var getVersion = function (str) {
    if (!str)
        return "";
    var match = str.match(semverReg);
    if (!match || !match.length) {
        return "";
    }
    var ver = match[0];
    if (ver.indexOf(".tgz") >= 0) {
        ver = ver.substr(0, ver.length - 4);
    }
    return ver;
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
    throw new Error("npm-shrinkwrap.json does not exist!");
}
if (!fs.existsSync(modulesPath)) {
    throw new Error("node_modules folder does not exist!");
}
//package.json中的所有版本号
console.log("");
console.log("Start parsing the version number in package.json...");
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
    console.log("Package.json module [" + k + "]\uFF0Cversion:[" + packageJsonVersionMap[k].toString() + "]");
});
//锁定版本的文件
console.log("");
console.log("Start analyzing locked version files...");
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
    console.log("Locked module [" + k + "],version:[" + lockedVersionMap[k].toString() + "]");
});
//node_modules 文件夹中的所有版本号
console.log("");
console.log("Start walking through the node_modules folder...");
var getInstalledVersion = function (currentFolderPath) {
    var files = [];
    try {
        files = fs.readdirSync(currentFolderPath);
    }
    catch (_a) { }
    files.forEach(function (folder) {
        if (invalidModulesNameReg.test(folder)) {
            //不统计子版本
            return;
        }
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
    console.log("Installed module [" + k + "],version:[" + installedVersionMap[k].toString() + "]");
});
//开始比较
var msgList = [];
console.log("");
console.log("Start compare versions......");
Object.keys(packageJsonVersionMap).forEach(function (packageKey) {
    if (!installedVersionMap[packageKey]) {
        msgList.push("The module [" + packageKey + "] does't  be installed!");
        return;
    }
    if (!lockedVersionMap[packageKey]) {
        msgList.push("The module [" + packageKey + "] not in npm-shrinkwrap.json!");
        return;
    }
    var installedVersion = installedVersionMap[packageKey].sort().toString();
    var lockedVersion = lockedVersionMap[packageKey].sort().toString();
    if (installedVersion !== lockedVersion) {
        msgList.push("The module [" + packageKey + "]'s version is different,locked version is:" + lockedVersion + ",installed version is:" + installedVersion);
        return;
    }
    var packageJsonVersion = (packageJsonVersionMap[packageKey] || [])[0];
    if (installedVersionMap[packageKey].indexOf(packageJsonVersion) == -1) {
        msgList.push("In package.json,the module [" + packageKey + "]'s version is different,installed version is:" + installedVersion + ",package.json's version is:" + packageJsonVersion);
        return;
    }
});
if (msgList.length) {
    console.log("\u001b[1;31m");
    msgList.forEach(function (k) {
        console.log(k);
    });
}
else {
    console.log("\u001b[1;32m");
    console.log("Modules's version compare is ok!");
}
