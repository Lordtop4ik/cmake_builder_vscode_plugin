import * as path from 'path';
import * as vscode from 'vscode';

export interface ProjectFile {
  fullUri: vscode.Uri;
  relativePath: string;
  fileName: string;
  extension: string;
  isHeader: boolean;
  isSource: boolean;
  hasMainFunction: boolean;
  includedHeaders: Array<string>;
}

const IGNORED_DIRECTORIES: Array<string> = [
  '.git',
  '.vscode',
  'node_modules',
  'build',
  'out',
  '.vscode-test',
];

const SOURCE_EXTENSIONS: Array<string> = ['.cpp', '.c', '.cc', '.cxx'];
const HEADER_EXTENSIONS: Array<string> = ['.h', '.hpp', '.hxx'];

// Рекурсивно сканирует папки проекта и находит все .cpp и .h файлы
export async function scanDirectoryForFiles(
  currentDirectoryUri: vscode.Uri,
  workspaceRootUri: vscode.Uri
): Promise<Array<ProjectFile>> {
  const collectedFiles: Array<ProjectFile> = [];
  const directoryEntries = await vscode.workspace.fs.readDirectory(currentDirectoryUri);

  for (const [entryName, fileType] of directoryEntries) {
    if (IGNORED_DIRECTORIES.includes(entryName)) {
      continue;
    }

    const entryUri = vscode.Uri.joinPath(currentDirectoryUri, entryName);

    if (fileType === vscode.FileType.Directory) {
      const nestedFiles = await scanDirectoryForFiles(entryUri, workspaceRootUri);
      for (const nestedFile of nestedFiles) {
        collectedFiles.push(nestedFile);
      }
    } else if (fileType === vscode.FileType.File) {
      const fileExtension = path.extname(entryName).toLowerCase();
      const isSourceFile = SOURCE_EXTENSIONS.includes(fileExtension);
      const isHeaderFile = HEADER_EXTENSIONS.includes(fileExtension);

      if (isSourceFile || isHeaderFile) {
        const relativeFilePath = path
          .relative(workspaceRootUri.fsPath, entryUri.fsPath)
          .split(path.sep)
          .join('/');

        collectedFiles.push({
          fullUri: entryUri,
          relativePath: relativeFilePath,
          fileName: entryName,
          extension: fileExtension,
          isHeader: isHeaderFile,
          isSource: isSourceFile,
          hasMainFunction: false,
          includedHeaders: [],
        });
      }
    }
  }

  return collectedFiles;
}
