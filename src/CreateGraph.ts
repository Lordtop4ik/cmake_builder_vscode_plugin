import * as path from 'path';
import { ProjectFile } from './fileScanner';

export interface ProjectStructureAnalysis {
  executableFiles: Array<ProjectFile>;
  libraryFiles: Array<ProjectFile>;
  headerFiles: Array<ProjectFile>;
  includeDirectories: Array<string>;
  sortedFilesOrder: Array<string>;
  adjacencyList: Map<string, Array<string>>;
}

export class DependencyGraph {
  private adjacencyList: Map<string, Array<string>> = new Map();

  // Добавляет вершину в граф
  public addNode(nodeIdentifier: string): void {
    if (!this.adjacencyList.has(nodeIdentifier)) {
      this.adjacencyList.set(nodeIdentifier, []);
    }
  }

  // Добавляет связь зависимости между двумя файлами
  public addEdge(fromNode: string, toNode: string): void {
    this.addNode(fromNode);
    this.addNode(toNode);

    const dependenciesList = this.adjacencyList.get(fromNode);
    if (dependenciesList && !dependenciesList.includes(toNode)) {
      dependenciesList.push(toNode);
    }
  }

  // Возвращает список смежности графа
  public getAdjacencyList(): Map<string, Array<string>> {
    return this.adjacencyList;
  }

  // Выполняет топологическую сортировку графа алгоритмом DFS
  public topologicalSort(): Array<string> {
    const visitedNodes: Map<string, number> = new Map();
    const sortedOrder: Array<string> = [];

    for (const nodeIdentifier of this.adjacencyList.keys()) {
      visitedNodes.set(nodeIdentifier, 0);
    }

    const visitNode = (currentNode: string) => {
      const visitState = visitedNodes.get(currentNode) || 0;

      if (visitState === 1) {
        return;
      }

      if (visitState === 2) {
        return;
      }

      visitedNodes.set(currentNode, 1);

      const adjacentNodes = this.adjacencyList.get(currentNode) || [];
      for (const neighborNode of adjacentNodes) {
        visitNode(neighborNode);
      }

      visitedNodes.set(currentNode, 2);
      sortedOrder.push(currentNode);
    };

    for (const nodeIdentifier of this.adjacencyList.keys()) {
      if (visitedNodes.get(nodeIdentifier) === 0) {
        visitNode(nodeIdentifier);
      }
    }

    return sortedOrder;
  }
}

// Строит граф зависимостей и разделяет файлы на библиотечные и исполняемые
export function buildAndAnalyzeGraph(
  projectFiles: Array<ProjectFile>
): ProjectStructureAnalysis {
  const dependencyGraph = new DependencyGraph();

  for (const file of projectFiles) {
    dependencyGraph.addNode(file.relativePath);
  }

  for (const currentFile of projectFiles) {
    for (const headerName of currentFile.includedHeaders) {
      const matchedHeaderFile = projectFiles.find((potentialHeader) => {
        return (
          potentialHeader.isHeader &&
          (potentialHeader.fileName === headerName ||
            potentialHeader.relativePath.endsWith(headerName))
        );
      });

      if (matchedHeaderFile) {
        dependencyGraph.addEdge(
          currentFile.relativePath,
          matchedHeaderFile.relativePath
        );
      }
    }
  }

  const sortedFilesOrder = dependencyGraph.topologicalSort();

  const executableFiles: Array<ProjectFile> = [];
  const libraryFiles: Array<ProjectFile> = [];
  const headerFiles: Array<ProjectFile> = [];
  const uniqueIncludeDirectoriesSet: Set<string> = new Set();

  for (const file of projectFiles) {
    if (file.isHeader) {
      headerFiles.push(file);

      const directoryOfHeader = path.dirname(file.relativePath);
      const normalizedDirectory =
        directoryOfHeader === '.' ? '.' : directoryOfHeader.split(path.sep).join('/');
      uniqueIncludeDirectoriesSet.add(normalizedDirectory);
    } else if (file.isSource) {
      if (file.hasMainFunction) {
        executableFiles.push(file);
      } else {
        libraryFiles.push(file);
      }
    }
  }

  if (uniqueIncludeDirectoriesSet.size === 0) {
    uniqueIncludeDirectoriesSet.add('.');
  }

  return {
    executableFiles: executableFiles,
    libraryFiles: libraryFiles,
    headerFiles: headerFiles,
    includeDirectories: Array.from(uniqueIncludeDirectoriesSet),
    sortedFilesOrder: sortedFilesOrder,
    adjacencyList: dependencyGraph.getAdjacencyList(),
  };
}
