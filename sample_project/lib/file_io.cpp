#include "file_io.h"
#include <fstream>
#include <iostream>

void printHelloWorld() {
  std::cout << "Hello, World!" << std::endl;
}

std::string readGreeting(const std::string& filePath) {
  std::ifstream file(filePath);
  if (!file.is_open()) {
    return "Hello, World!";
  }
  std::string line;
  std::getline(file, line);
  return line;
}
