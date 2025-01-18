import fs from "fs";
import path from "path";
import zlib from 'zlib';
import util from 'util';
import fsPromises from 'fs/promises';

/** cwd路径 */
export const _cwdDir = process.env.pm_cwd || process.cwd();
/** 拷贝文件或目录 */
export async function copyDir(sourceDir: string, destDir: string, exts: string[] = []) {
    try { await fsPromises.access(sourceDir); } catch (err) { return; };
    // 如果是文件，直接复制文件
    if ((!(await fsPromises.stat(sourceDir)).isDirectory()) && (exts.length == 0 || exts.includes(path.extname(sourceDir)))) return await fsPromises.copyFile(sourceDir, destDir);
    // 创建目标目录，如果不存在
    await fsPromises.mkdir(destDir, { recursive: true });
    // 读取源目录中的文件和文件夹
    const entries = await fsPromises.readdir(sourceDir, { withFileTypes: true });
    // 存储所有复制操作的 Promise
    const copyPromises = entries.map(async (entry) => {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            // 递归拷贝子文件夹
            await copyDir(sourcePath, destPath);
        } else {
            // 拷贝文件，覆盖目标目录中的现有文件
            if (exts.length == 0 || exts.includes(path.extname(sourcePath))) await fsPromises.copyFile(sourcePath, destPath);
        }
    });
    // 等待所有拷贝操作完成
    await Promise.all(copyPromises);
}
/** 删除文件或者目录 */
export async function delFiles(dir: string, exts: string[] = []) {
    try { await fsPromises.access(dir); } catch (err) { return; }
    // 如果是文件，直接删除
    if ((await fsPromises.stat(dir)).isFile()) return await fsPromises.unlink(dir);
    // 如果是目录，读取目录中的所有文件和文件夹
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    // 先删除所有文件
    const deletePromises = [];
    for (let entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            // 如果是子目录，递归处理子目录
            await delFiles(fullPath, exts);
        } else if (entry.isFile() && (exts.length == 0 || exts.includes(path.extname(fullPath)))) {
            deletePromises.push(fsPromises.unlink(fullPath));
        }
    }
    // 等待文件删除操作完成
    await Promise.all(deletePromises);
    // 删除当前目录，如果为空
    if ((await fsPromises.readdir(dir)).length === 0) await fsPromises.rmdir(dir);
}
/** 递归设置属性 */
export function setValueByPath(target: any, path: string[], value: any, type: "inc" | "set" | "unset" | "push" | "pull" = "set", ext: { min?: number, max?: number, leng?: number } = {}): void {
    const key = path[0];
    if (path.length === 1) {
        switch (type) {
            case "inc":
                if (typeof target[key] != "number") { throw new Error("inc 操作的属性不为数字"); };
                let val = target[key] || 0;
                val += value;
                val = Math.max(val, typeof ext.min === 'number' ? ext.min : -Infinity);
                val = Math.min(val, typeof ext.max === 'number' ? ext.max : Infinity);
                target[key] = val;
                break;
            case "set":
                target[key] = value;
                break;
            case "unset":
                delete target[key];
                break;
            case "push":
                if (!Array.isArray(target[key])) { throw new Error("push 操作的属性不为数组"); };
                target[key] = [...(target[key]), value].slice(typeof ext.leng === 'number' ? -Math.abs(ext.leng) : -Infinity);
                break;
            case "pull":
                if (!Array.isArray(target[key])) { throw new Error("push 操作的属性不为数组"); }
                const index = target[key].indexOf(value);
                index > -1 && target[key].splice(index, 1);
                break;
        }
    } else {
        target[key] = target[key] || {};
        setValueByPath(target[key], path.slice(1), value, type, ext);
    }
}
/** 递归获取属性值 */
export function getValueByPath(target: any, path: string[]): any {
    const key = path[0];
    if (path.length === 1) {
        return target[key];
    } else {
        if (!target[key]) return void 0;
        return getValueByPath(target[key], path.slice(1));
    }
}
/** 统一路径分隔符 */
export function normalizePath(fromPath: string, toPath: string) { return path.relative(fromPath, toPath).split(path.sep).join('/'); }
/** 加载某个目录所有文件 */
export function loadAllFile(source: string, fileList: string[] = []) {
    const files = fs.readdirSync(source);
    files.forEach((file) => {
        const srcPath = source + "/" + file;
        if (fs.statSync(srcPath).isDirectory()) {
            loadAllFile(srcPath, fileList);
        } else {
            fileList.push(srcPath);
        }
    })
    return fileList;
}
/** 解析命令行参数 -name value */
export function parseArgs(): any {
    const args = {};
    const argv = process.argv;
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg.startsWith("-")) {
            args[arg.substring(1)] = argv[index + 1];
        }
    }
    return args;
}
/** 使用 brotli 算法压缩 wasm 文件 */
export async function compressWasmFile(inputPath: string, outputPath?: string, params?: any) {
    const brotliCompress = util.promisify(zlib.brotliCompress);
    const wasmBuffer = fs.readFileSync(inputPath);
    const compressedBuffer = await brotliCompress(wasmBuffer, {
        params: params || {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,            // 最高质量
            [zlib.constants.BROTLI_PARAM_LGWIN]: 24,             // 最大窗口大小
            [zlib.constants.BROTLI_PARAM_MODE]: 2,               // 文本压缩模式
            [zlib.constants.BROTLI_PARAM_SIZE_HINT]: wasmBuffer.length, // 文件大小提示
            [zlib.constants.BROTLI_PARAM_LGBLOCK]: 24,           // 最大块大小
        }
    });
    fs.writeFileSync(outputPath || `${inputPath}.br`, compressedBuffer);
}