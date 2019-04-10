"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var semver_1 = __importDefault(require("semver"));
var packageJsonPath = path.resolve("./package.json");
var modulesPath = path.resolve("./node_modules");
var lockedVersionPath = path.resolve("./package-lock.json");
var msgList = [];
var getVersion = function (str) {
    if (!semver_1.default.valid(str)) {
        return "";
    }
    return str;
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
        msgList.push("package-lock.json does not exist!");
        return;
    }
    if (!packageJsonFileObj) {
        msgList.push("node_modules folder does not exist!");
        return;
    }
    packageJsonFileObj.dependencies = packageJsonFileObj.dependencies || {};
    packageJsonFileObj.devDependencies = packageJsonFileObj.devDependencies || {};
    //检查node环境
    if (packageJsonFileObj.engines) {
        if (packageJsonFileObj.engines.node && !semver_1.default.satisfies(process.versions.node, packageJsonFileObj.engines.node)) {
            msgList.push("The node version that the current project depends on is : [" + packageJsonFileObj.engines.node + "] ,but you installed version is [" + process.versions.node + "] ,please check it!");
            return;
        }
    }
    //检查package.json与package-lock.json的名称和版本号是否一致
    if (lockedFileObj.name !== packageJsonFileObj.name || lockedFileObj.version !== packageJsonFileObj.version) {
        msgList.push("Project's package.json name or version field is different with package-lock.json,please check it!");
        return;
    }
    //检查dependencies与devDependencies是否有重复的节点
    Object.keys(packageJsonFileObj.dependencies).forEach(function (k) {
        if (typeof (packageJsonFileObj.devDependencies[k]) != 'undefined') {
            msgList.push("Module " + k + " exists in both dependencies and devDependencies,please remove one of it!");
        }
    });
    //检查package.json中的包是否已全部正确安装
    console.log("");
    console.log("Start checking the version number in package.json...");
    [packageJsonFileObj.dependencies, packageJsonFileObj.devDependencies].forEach(function (obj) {
        if (!obj)
            return;
        Object.keys(obj).forEach(function (k) {
            var verInPackageJson = getVersion(obj[k]);
            //检查package.json中的依赖包是否与package-lock.json一致
            if (!lockedFileObj.dependencies || !lockedFileObj.dependencies[k]) {
                msgList.push("Moudle " + k + " is not in package-lock.json,please try run npm i !");
                return;
            }
            var lockedVer = getVersion(lockedFileObj.dependencies[k].version);
            if (lockedVer !== verInPackageJson) {
                msgList.push("Moudle " + k + ": package.json's version(" + verInPackageJson + ") is different with package-lock.json version(" + lockedVer + "),please check it!");
                return;
            }
            //检查是否已正确安装
            var mpath = path.resolve(modulesPath, k + "/package.json");
            var installedObj = getJsonObjectFromFilePath(mpath);
            if (!installedObj) {
                msgList.push(mpath + " does not found,please check it!");
                return;
            }
            if (installedObj.version !== verInPackageJson) {
                msgList.push("Module [" + k + "]: project package.json version(" + verInPackageJson + ") is different with installed(" + installedObj.version + "),please try run npm i !");
                return;
            }
        });
    });
})();
if (msgList.length) {
    console.log("\u001b[1;31m");
    msgList.forEach(function (k) {
        console.log(k);
    });
    console.log("\x1b[0m");
    process.exit(1);
}
else {
    console.log("\u001b[1;32m");
    console.log("=======================^_^=========^_^==========^_^===============================");
    console.log("x-package-version-strict-check: Module version matching completed, everything is ok!");
    console.log("=======================^_^=========^_^==========^_^===============================");
    console.log("\x1b[0m");
}
