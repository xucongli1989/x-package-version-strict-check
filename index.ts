import * as fs from "fs"
import * as  path from "path"

const semverReg = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/ig//https://github.com/sindresorhus/semver-regex
const packageJsonPath = path.resolve("./package.json")
const modulesPath = path.resolve("./node_modules")
const lockedVersionPath = path.resolve("./package-lock.json")
const msgList: string[] = []
const getVersion = (str: string) => {
    if (!str) return ""
    const match = str.match(semverReg)
    if (!match || !match.length) {
        return ""
    }
    let ver = match[0]
    if (ver.indexOf(".tgz") >= 0) {
        ver = ver.substr(0, ver.length - 4)
    }
    return ver
}
const getJsonObjectFromFilePath = (filePath: string) => {
    try {
        return JSON.parse(fs.readFileSync(filePath).toString())
    } catch{
        return null
    }
}

(() => {
    console.log("")
    console.log("Please wait while checking the version information......");
    const lockedFileObj = getJsonObjectFromFilePath(lockedVersionPath)
    const packageJsonFileObj = getJsonObjectFromFilePath(packageJsonPath)
    if (!lockedFileObj) {
        msgList.push("package-lock.json does not exist!")
        return
    }
    if (!packageJsonFileObj) {
        msgList.push("node_modules folder does not exist!")
        return
    }

    packageJsonFileObj.dependencies = packageJsonFileObj.dependencies || {}
    packageJsonFileObj.devDependencies = packageJsonFileObj.devDependencies || {}

    //检查package.json与package-lock.json的名称和版本号是否一致
    if (lockedFileObj.name !== packageJsonFileObj.name || lockedFileObj.version !== packageJsonFileObj.version) {
        msgList.push("Project's package.json name or version field is different with package-lock.json,please check it!")
        return
    }

    //检查dependencies与devDependencies是否有重复的节点
    Object.keys(packageJsonFileObj.dependencies).forEach(k => {
        if (typeof (packageJsonFileObj.devDependencies[k]) != 'undefined') {
            msgList.push(`Module ${k} exists in both dependencies and devDependencies!`);
        }
    });

    //检查package.json中的包是否已全部正确安装
    console.log("")
    console.log("Start checking the version number in package.json...");
    [packageJsonFileObj.dependencies, packageJsonFileObj.devDependencies].forEach(obj => {
        if (!obj) return
        Object.keys(obj).forEach(k => {
            const verInPackageJson = getVersion(obj[k])
            //检查package.json中的依赖包是否与package-lock.json一致
            if (!lockedFileObj.dependencies || !lockedFileObj.dependencies[k]) {
                msgList.push(`Moudle ${k} is not in package-lock.json!`)
                return
            }
            const lockedVer = getVersion(lockedFileObj.dependencies[k].version)
            if (lockedVer !== verInPackageJson) {
                msgList.push(`Moudle ${k}: package.json's version(${verInPackageJson}) is different with package-lock.json version(${lockedVer})!`)
                return
            }
            //检查是否已正确安装
            let mpath = path.resolve(modulesPath, `${k}/package.json`)
            let installedObj = getJsonObjectFromFilePath(mpath)
            if (!installedObj) {
                msgList.push(`${mpath} does not found!`)
                return
            }
            if (installedObj.version !== verInPackageJson) {
                msgList.push(`Module [${k}]: project package.json version(${verInPackageJson}) is different with installed(${installedObj.version})!`)
                return
            }
        })
    })
})()

if (msgList.length) {
    console.log("\u001b[1;31m")
    msgList.forEach(k => {
        console.log(k)
    })
    console.log("\x1b[0m");
    process.exit(1)
} else {
    console.log("\u001b[1;32m")
    console.log("=======================^_^=========^_^==========^_^===============================")
    console.log("x-package-version-strict-check: Module version matching completed, everything is ok!")
    console.log("=======================^_^=========^_^==========^_^===============================")
    console.log("\x1b[0m");
}