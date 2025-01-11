#!/usr/bin/env node
import path from 'path';
import { copyDir, delFiles } from './utils';

/** cwd路径 */
const _cwdDir: string = process.env.pm_cwd || process.cwd();
const cmd = process.argv[2];
//拷贝文件或目录
if (cmd == "copy") {
    const sourceDir = path.resolve(_cwdDir, process.argv[3]); // 源目录
    const destDir = path.resolve(_cwdDir, process.argv[4]); // 目标目录
    copyDir(sourceDir, destDir, process.argv.splice(5, process.argv.length));
}
//删除文件或目录
if (cmd == "del") {
    const targetDir = path.resolve(_cwdDir, process.argv[3]); // 目标目录
    delFiles(targetDir, process.argv.splice(4, process.argv.length));
}
