import path from "path";
import fsPromises from 'fs/promises';

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