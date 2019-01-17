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

    //检查package.json与package-lock.json的名称和版本号是否一致
    if (lockedFileObj.name !== packageJsonFileObj.name || lockedFileObj.version !== packageJsonFileObj.version) {
        msgList.push("Project's package.json name or version field is different with package-lock.json,please check it!")
        return
    }

    // //检查锁定版本的文件中的包是否已全部正确安装
    // console.log("")
    // console.log("Start check package-lock.json's versions in current project's node_modules folder......")
    // const checkLockedVersion = (rootNodeModulesPath: string, currentName: string, currentNode: any) => {
    //     if (!currentNode || !currentNode.version) {
    //         return
    //     }
    //     const ver = getVersion(currentNode.version)
    //     const currentNodePath = path.resolve(rootNodeModulesPath, currentName)
    //     const currentPackageJsonPath = path.resolve(currentNodePath, "package.json")
    //     const currentNodePackageJson = getJsonObjectFromFilePath(currentPackageJsonPath)
    //     if (!currentNodePackageJson) {
    //         msgList.push(`${currentPackageJsonPath} not found!`)
    //         return
    //     }
    //     if (currentNodePackageJson.version !== ver) {
    //         msgList.push(`Module [${currentName}]: package-lock.json's version(${ver}) is different with installed(${currentNodePackageJson.version})! (Check path:${currentPackageJsonPath})`)
    //         return
    //     }
    //     if (currentNode.dependencies) {
    //         Object.keys(currentNode.dependencies).forEach(k => {
    //             checkLockedVersion(path.resolve(currentNodePath, `node_modules`), k, currentNode.dependencies[k])
    //         })
    //     }
    // }
    // Object.keys(lockedFileObj.dependencies).forEach(k => {
    //     checkLockedVersion(modulesPath, k, lockedFileObj.dependencies[k])
    // })
    // if (msgList.length) {
    //     return
    // }

    //检查package.json中的包是否已全部正确安装
    console.log("")
    console.log("Start check the version number in package.json...");
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
    process.exit(1)
} else {
    console.log("\u001b[1;32m")
    console.log("Modules's version compare is ok!")
}