import * as path from 'path';
import * as vscode from 'vscode';
import { generateCMakeListsContent } from './cmakeGenerator';
import { buildAndAnalyzeGraph } from './CreateGraph';
import { parseAllProjectFiles } from './filesParser';
import { scanDirectoryForFiles } from './fileScanner';

// Активирует плагин в VS Code и регистрирует команду генерации CMakeLists.txt
export function activate(context: vscode.ExtensionContext): void {
  const disposableCommand = vscode.commands.registerCommand(
    'cmakeGenerator.generateCMakeLists',
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage(
          'Откройте папку с проектом C/C++ в VS Code перед запуском генератора.'
        );
        return;
      }

      const rootWorkspaceFolder = workspaceFolders[0];
      const rootWorkspaceUri = rootWorkspaceFolder.uri;
      const cmakeFileUri = vscode.Uri.joinPath(rootWorkspaceUri, 'CMakeLists.txt');

      let fileAlreadyExists = false;
      try {
        await vscode.workspace.fs.stat(cmakeFileUri);
        fileAlreadyExists = true;
      } catch {
        fileAlreadyExists = false;
      }

      if (fileAlreadyExists) {
        const userChoice = await vscode.window.showWarningMessage(
          'Файл CMakeLists.txt уже существует в корне проекта. Перезаписать его?',
          { modal: true },
          'Перезаписать',
          'Отмена'
        );

        if (userChoice !== 'Перезаписать') {
          vscode.window.showInformationMessage('Генерация CMakeLists.txt отменена.');
          return;
        }
      }

      try {
        vscode.window.showInformationMessage('Сканирование структуры проекта...');
        const foundFiles = await scanDirectoryForFiles(rootWorkspaceUri, rootWorkspaceUri);

        if (foundFiles.length === 0) {
          vscode.window.showWarningMessage(
            'В проекте не найдено исходных (.cpp) или заголовочных (.h) файлов.'
          );
          return;
        }

        const parsedFiles = await parseAllProjectFiles(foundFiles);
        const analysis = buildAndAnalyzeGraph(parsedFiles);

        const projectName = path.basename(rootWorkspaceUri.fsPath) || 'MyProject';
        const cmakeFileContent = generateCMakeListsContent(projectName, analysis);

        const encodedContent = Buffer.from(cmakeFileContent, 'utf-8');
        await vscode.workspace.fs.writeFile(cmakeFileUri, encodedContent);

        const openedDocument = await vscode.workspace.openTextDocument(cmakeFileUri);
        await vscode.window.showTextDocument(openedDocument);

        vscode.window.showInformationMessage(
          `Файл CMakeLists.txt успешно создан для проекта "${projectName}"!`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Неизвестная ошибка при генерации.';
        vscode.window.showErrorMessage(`Ошибка генерации: ${errorMessage}`);
      }
    }
  );

  context.subscriptions.push(disposableCommand);
}

// Деактивирует плагин при выключении
export function deactivate(): void {}
