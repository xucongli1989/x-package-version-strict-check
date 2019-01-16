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
var semverReg = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/ig; //https://github.com/sindresorhus/semver-regex
var packageJsonPath = path.resolve("./package.json");
var modulesPath = path.resolve("./node_modules");
var lockedVersionPath = path.resolve("./npm-shrinkwrap.json");
var msgList = [];
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
var getJsonObjectFromFilePath = function (filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath).toString());
    }
    catch (_a) {
        return null;
    }
};
(function () {
    console.log("");
    console.log("Please wait while checking the version information......");
    var lockedFileObj = getJsonObjectFromFilePath(lockedVersionPath);
    var packageJsonFileObj = getJsonObjectFromFilePath(packageJsonPath);
    if (!lockedFileObj) {
        msgList.push("npm-shrinkwrap.json does not exist!");
        return;
    }
    if (!packageJsonFileObj) {
        msgList.push("node_modules folder does not exist!");
        return;
    }
    //检查package.json与npm-shrinkwrap.json的名称和版本号是否一致
    if (lockedFileObj.name !== packageJsonFileObj.name || lockedFileObj.version !== packageJsonFileObj.version) {
        msgList.push("Project's package.json name or version field is different with npm-shrinkwrap.json,please check it!");
        return;
    }
    //检查锁定版本的文件中的包是否已全部正确安装
    console.log("");
    console.log("Start check npm-shrinkwrap.json's versions in current project's node_modules folder......");
    var checkLockedVersion = function (rootNodeModulesPath, currentName, currentNode) {
        if (!currentNode || !currentNode.version) {
            return;
        }
        var ver = getVersion(currentNode.version);
        var currentNodePath = path.resolve(rootNodeModulesPath, currentName);
        var currentPackageJsonPath = path.resolve(currentNodePath, "package.json");
        var currentNodePackageJson = getJsonObjectFromFilePath(currentPackageJsonPath);
        if (!currentNodePackageJson) {
            msgList.push(currentPackageJsonPath + " not found!");
            return;
        }
        if (currentNodePackageJson.version !== ver) {
            msgList.push("Module [" + currentName + "]: npm-shrinkwrap.json's version(" + ver + ") is different with installed(" + currentNodePackageJson.version + ")! (Check path:" + currentPackageJsonPath + ")");
            return;
        }
        if (currentNode.dependencies) {
            Object.keys(currentNode.dependencies).forEach(function (k) {
                checkLockedVersion(path.resolve(currentNodePath, "node_modules"), k, currentNode.dependencies[k]);
            });
        }
    };
    Object.keys(lockedFileObj.dependencies).forEach(function (k) {
        checkLockedVersion(modulesPath, k, lockedFileObj.dependencies[k]);
    });
    if (msgList.length) {
        return;
    }
    //检查package.json中的包是否已全部正确安装
    console.log("");
    console.log("Start check the version number in package.json...");
    [packageJsonFileObj.dependencies, packageJsonFileObj.devDependencies].forEach(function (obj) {
        if (!obj)
            return;
        Object.keys(obj).forEach(function (k) {
            var verInPackageJson = getVersion(obj[k]);
            var mpath = path.resolve(modulesPath, k + "/package.json");
            var installedObj = getJsonObjectFromFilePath(mpath);
            if (!installedObj) {
                msgList.push(mpath + " does not found!");
            }
            if (installedObj.version !== verInPackageJson) {
                msgList.push("Module [" + k + "]: project package.json version(" + verInPackageJson + ") is different with installed(" + installedObj.version + ")!");
            }
        });
    });
})();
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
