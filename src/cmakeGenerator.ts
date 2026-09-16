import * as path from 'path';
import { ProjectStructureAnalysis } from './CreateGraph';

// Формирует итоговый текст файла CMakeLists.txt на основе анализа проекта
export function generateCMakeListsContent(
  projectName: string,
  analysis: ProjectStructureAnalysis
): string {
  const contentLines: Array<string> = [];

  contentLines.push('cmake_minimum_required(VERSION 3.15)');
  contentLines.push('');
  contentLines.push(`project(${projectName} C CXX)`);
  contentLines.push('');
  contentLines.push('set(CMAKE_CXX_STANDARD 17)');
  contentLines.push('set(CMAKE_CXX_STANDARD_REQUIRED ON)');
  contentLines.push('set(CMAKE_EXPORT_COMPILE_COMMANDS ON)');
  contentLines.push('');

  const includeDirectoriesPaths: Array<string> = analysis.includeDirectories.map(
    (directoryPath) => {
      if (directoryPath === '.') {
        return '${CMAKE_CURRENT_SOURCE_DIR}';
      }
      return `\${CMAKE_CURRENT_SOURCE_DIR}/${directoryPath}`;
    }
  );

  let libraryTargetName = `${projectName}_lib`;
  if (
    analysis.libraryFiles.length > 0 &&
    analysis.libraryFiles.every((file) => file.relativePath.startsWith('lib/'))
  ) {
    libraryTargetName = 'lib';
  }

  const hasLibraryFiles = analysis.libraryFiles.length > 0;

  if (hasLibraryFiles) {
    contentLines.push(`add_library(${libraryTargetName} STATIC`);
    for (const libraryFile of analysis.libraryFiles) {
      contentLines.push(`    ${libraryFile.relativePath}`);
    }
    contentLines.push(')');
    contentLines.push('');

    contentLines.push(`target_include_directories(${libraryTargetName} PUBLIC`);
    for (const includePath of includeDirectoriesPaths) {
      contentLines.push(`    ${includePath}`);
    }
    contentLines.push(')');
    contentLines.push('');
  }

  if (analysis.executableFiles.length > 0) {
    for (const executableFile of analysis.executableFiles) {
      let targetName = path.basename(executableFile.fileName, executableFile.extension);
      if (targetName === 'main' && analysis.executableFiles.length === 1) {
        targetName = projectName.toLowerCase();
      }

      contentLines.push(`add_executable(${targetName}`);
      contentLines.push(`    ${executableFile.relativePath}`);
      contentLines.push(')');
      contentLines.push('');

      contentLines.push(`target_include_directories(${targetName} PRIVATE`);
      for (const includePath of includeDirectoriesPaths) {
        contentLines.push(`    ${includePath}`);
      }
      contentLines.push(')');
      contentLines.push('');

      if (hasLibraryFiles) {
        contentLines.push(`target_link_libraries(${targetName} PRIVATE`);
        contentLines.push(`    ${libraryTargetName}`);
        contentLines.push(')');
        contentLines.push('');
      }
    }
  } else if (!hasLibraryFiles) {
    contentLines.push('# В проекте не обнаружены .cpp файлы для компиляции');
    contentLines.push(`add_executable(${projectName.toLowerCase()} main.cpp)`);
  }

  return contentLines.join('\n') + '\n';
}
