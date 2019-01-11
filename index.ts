import * as fs from "fs"
import * as  path from "path"

interface VersionInfoType {
    [moduleName: string]: string[]
}

const packageJsonPath = path.resolve(__dirname, "package.json")
const modulesPath = path.resolve(__dirname, "node_modules")
const lockedVersionPath = path.resolve(__dirname, "npm-shrinkwrap.json")
const lockedVersionMap: VersionInfoType = {}
const installedVersionMap: VersionInfoType = {}
const packageJsonVersionMap: VersionInfoType = {}
const getVersion = (str: string) => {
    if (!str) return ""
    if (/^(\d+\.)*\d+$/gi.test(str)) {
        return str
    }
    let match = null
    match = str.match(/((\d+\.)+\d+)$/gi)
    if (match && match.length) {
        return match[0]
    }
    match = str.match(/(\d+\.)+tgz$/gi)
    if (match && match.length) {
        return match[0].substr(0, match[0].length - 4)
    }
    return ""
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
    throw new Error("npm-shrinkwrap.json文件不存在！")
}
if (!fs.existsSync(modulesPath)) {
    throw new Error("node_modules文件夹不存在！")
}

//package.json中的所有版本号
console.log("开始分析package.json中的版本号......")
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
    console.log(`Package.json中的模块【${k}】，版本号：【${packageJsonVersionMap[k].toString()}】`)
})

//锁定版本的文件
console.log("\n开始分析锁定的版本文件......")
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
    console.log(`锁定【${k}】模块，版本号：【${lockedVersionMap[k].toString()}】`)
})

//node_modules 文件夹中的所有版本号
console.log("\n开始遍历node_modules文件夹......")
const getInstalledVersion = (currentFolderPath: string) => {
    let files: string[] = []
    try {
        files = fs.readdirSync(currentFolderPath)
    } catch{ }
    files.forEach((folder) => {
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
    console.log(`已安装【${k}】模块，版本号：【${installedVersionMap[k].toString()}】`)
})

//开始比较
console.log("\n开始比较版本号......")
Object.keys(lockedVersionMap).forEach(lockedKey => {
    if (!installedVersionMap[lockedKey]) {
        throw new Error(`请检查模块【${lockedKey}】是否已安装！`)
    }
    const installedVersion = installedVersionMap[lockedKey].sort().toString()
    const lockedVersion = installedVersionMap[lockedKey].sort().toString()
    if (installedVersion !== lockedVersion) {
        throw new Error(`模块【${lockedKey}】版本号不一致，锁定的版本为：${lockedVersion}，已安装的版本号为：${installedVersion}`)
    }
    const packageJsonVersion = (packageJsonVersionMap[lockedKey] || [])[0]
    if (packageJsonVersion && installedVersionMap[lockedKey].indexOf(packageJsonVersion) == -1) {
        throw new Error(`Package.json文件中的模块【${lockedKey}】版本号不一致，已安装的版本为：${installedVersion}，package.json中的版本号为：${packageJsonVersion}`)
    }
})
console.log("对比结束，所有模块版本号正常！")