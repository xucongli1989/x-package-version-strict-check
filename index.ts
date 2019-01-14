import * as fs from "fs"
import * as  path from "path"

interface VersionInfoType {
    [moduleName: string]: string[]
}

const invalidModulesNameReg = /@.+@/
const semverReg = /\bv?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[\da-z-]+(?:\.[\da-z-]+)*)?(?:\+[\da-z-]+(?:\.[\da-z-]+)*)?\b/ig//https://github.com/sindresorhus/semver-regex
const packageJsonPath = path.resolve("./package.json")
const modulesPath = path.resolve("./node_modules")
const lockedVersionPath = path.resolve("./npm-shrinkwrap.json")
const lockedVersionMap: VersionInfoType = {}
const installedVersionMap: VersionInfoType = {}
const packageJsonVersionMap: VersionInfoType = {}
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
const unique = <T>(arr: T[]): T[] => {
    if (!arr || arr.length <= 1) {
        return arr;
    }
    let newArr = [...arr], duplicateIdx = [], idxLength = 0;
    for (let i = 1; i < newArr.length; i++) {
        if (newArr[i] === newArr[i - 1]) {
            idxLength = duplicateIdx.push(i);
        }
    }
    if (idxLength > 0) {
        while (idxLength--) {
            newArr.splice(duplicateIdx[idxLength], 1);
        }
    }
    return newArr
}
if (!fs.existsSync(lockedVersionPath)) {
    throw new Error("npm-shrinkwrap.json does not exist!")
}
if (!fs.existsSync(modulesPath)) {
    throw new Error("node_modules folder does not exist!")
}

//package.json中的所有版本号
console.log("")
console.log("Start parsing the version number in package.json...")
const packageJsonFileObj = JSON.parse(fs.readFileSync(packageJsonPath).toString()) as any
[packageJsonFileObj.dependencies, packageJsonFileObj.devDependencies].forEach(obj => {
    if (!obj) return
    Object.keys(obj).forEach(k => {
        if (!packageJsonVersionMap[k]) {
            packageJsonVersionMap[k] = []
        }
        packageJsonVersionMap[k].push(getVersion(obj[k]))
    })
})
Object.keys(packageJsonVersionMap).forEach(k => {
    packageJsonVersionMap[k] = unique(packageJsonVersionMap[k])
    console.log(`Package.json module [${k}]，version:[${packageJsonVersionMap[k].toString()}]`)
})

//锁定版本的文件
console.log("")
console.log("Start analyzing locked version files...")
const lockedFileObj = JSON.parse(fs.readFileSync(lockedVersionPath).toString())
const getVersionFromNode = (currentName: string, currentNode: any) => {
    if (!currentNode || !currentNode.version) {
        return
    }
    const ver = getVersion(currentNode.version)
    if (!lockedVersionMap[currentName]) {
        lockedVersionMap[currentName] = []
    }
    lockedVersionMap[currentName].push(ver)
    if (currentNode.dependencies) {
        Object.keys(currentNode.dependencies).forEach(k => {
            getVersionFromNode(k, currentNode.dependencies[k])
        })
    }
}
Object.keys(lockedFileObj.dependencies).forEach(k => {
    getVersionFromNode(k, lockedFileObj.dependencies[k])
})
Object.keys(lockedVersionMap).forEach(k => {
    lockedVersionMap[k] = unique(lockedVersionMap[k])
    console.log(`Locked module [${k}],version:[${lockedVersionMap[k].toString()}]`)
})

//node_modules 文件夹中的所有版本号
console.log("")
console.log("Start walking through the node_modules folder...")
const getInstalledVersion = (currentFolderPath: string) => {
    let files: string[] = []
    try {
        files = fs.readdirSync(currentFolderPath)
    } catch{ }
    files.forEach((folder) => {
        if (invalidModulesNameReg.test(folder)) {
            //不统计子版本
            return
        }
        const packagePath = path.resolve(currentFolderPath, `${folder}/package.json`)
        if (!fs.existsSync(packagePath)) {
            getInstalledVersion(path.resolve(currentFolderPath, folder))
            return
        }
        const data = fs.readFileSync(packagePath)
        const obj = JSON.parse(data.toString())
        if (!installedVersionMap[obj.name]) {
            installedVersionMap[obj.name] = []
        }
        installedVersionMap[obj.name].push(obj.version)
    })
}
getInstalledVersion(modulesPath)
Object.keys(installedVersionMap).forEach(k => {
    installedVersionMap[k] = unique(installedVersionMap[k])
    console.log(`Installed module [${k}],version:[${installedVersionMap[k].toString()}]`)
})

//开始比较
const msgList: string[] = []
console.log("")
console.log("Start compare versions......")
Object.keys(packageJsonVersionMap).forEach(packageKey => {
    if (!installedVersionMap[packageKey]) {
        msgList.push(`The module [${packageKey}] does't  be installed!`)
        return
    }
    if (!lockedVersionMap[packageKey]) {
        msgList.push(`The module [${packageKey}] not in npm-shrinkwrap.json!`)
        return
    }
    const installedVersion = installedVersionMap[packageKey].sort().toString()
    const lockedVersion = lockedVersionMap[packageKey].sort().toString()
    if (installedVersion !== lockedVersion) {
        msgList.push(`The module [${packageKey}]'s version is different,locked version is:${lockedVersion},installed version is:${installedVersion}`)
        return
    }
    const packageJsonVersion = (packageJsonVersionMap[packageKey] || [])[0]
    if (installedVersionMap[packageKey].indexOf(packageJsonVersion) == -1) {
        msgList.push(`In package.json,the module [${packageKey}]'s version is different,installed version is:${installedVersion},package.json's version is:${packageJsonVersion}`)
        return
    }
})
if (msgList.length) {
    console.log("\u001b[1;31m")
    msgList.forEach(k => {
        console.log(k)
    })
} else {
    console.log("\u001b[1;32m")
    console.log("Modules's version compare is ok!")
}