import * as vscode from 'vscode';
import { ProjectFile } from './fileScanner';

// Читает файл, ищет в нем директивы #include и проверяет наличие main
export async function parseSingleFile(file: ProjectFile): Promise<ProjectFile> {
  const fileBytes: Uint8Array = await vscode.workspace.fs.readFile(file.fullUri);
  const fileContent: string = Buffer.from(fileBytes).toString('utf-8');

  const detectedHeaders: Array<string> = [];
  let containsMainFunction: boolean = false;

  const lines: Array<string> = fileContent.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('#include') && trimmedLine.includes('"')) {
      const lineParts: Array<string> = trimmedLine.split('"');
      if (lineParts.length >= 2) {
        const headerName = lineParts[1];
        detectedHeaders.push(headerName);
      }
    }

    if (file.isSource) {
      if (trimmedLine.includes('int main') || trimmedLine.includes('main(')) {
        containsMainFunction = true;
      }
    }
  }

  return {
    ...file,
    includedHeaders: detectedHeaders,
    hasMainFunction: containsMainFunction,
  };
}

// Парсит список всех переданных файлов проекта
export async function parseAllProjectFiles(
  filesList: Array<ProjectFile>
): Promise<Array<ProjectFile>> {
  const parsedFiles: Array<ProjectFile> = [];

  for (const currentFile of filesList) {
    const parsedFile: ProjectFile = await parseSingleFile(currentFile);
    parsedFiles.push(parsedFile);
  }

  return parsedFiles;
}
