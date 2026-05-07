import * as path from 'path'
import * as fs from 'fs-extra'

export interface VersionFileEntry {
  path: string
  hash: string
  size: number
}

export interface VersionSwitchResult {
  success: boolean
  message?: string
  viewPath?: string
  files?: VersionFileEntry[]
}

/**
 * Checkout a specific version to a temporary read-only directory.
 * Returns the temp path so the renderer can read files from it.
 */
export async function switchToVersionReadonly(
  rootPath: string,
  repoPath: string,
  version: string
): Promise<VersionSwitchResult> {
  const tmpDir = path.join(rootPath, 'tmp', `view-${version}`)

  try {
    // Clean up any previous temp checkout
    if (await fs.pathExists(tmpDir)) {
      await fs.remove(tmpDir)
    }

    // Load commit data
    const commitPath = path.join(repoPath, 'commits', `${version}.json`)
    if (!(await fs.pathExists(commitPath))) {
      return { success: false, message: `Version ${version} not found` }
    }

    const commit = await fs.readJson(commitPath)
    const files: VersionFileEntry[] = commit.files || []

    // Restore files from blobs
    for (const file of files) {
      const blobPath = path.join(repoPath, 'objects', `${file.hash}.blob`)
      if (!(await fs.pathExists(blobPath))) {
        return { success: false, message: `Blob missing: ${file.path}` }
      }
      const dest = path.join(tmpDir, file.path)
      await fs.ensureDir(path.dirname(dest))
      await fs.copyFile(blobPath, dest)
    }

    return { success: true, viewPath: tmpDir, files }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

/**
 * Release a read-only version checkout — delete temp directory.
 */
export async function releaseVersionReadonly(
  rootPath: string,
  version: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const tmpDir = path.join(rootPath, 'tmp', `view-${version}`)
    if (await fs.pathExists(tmpDir)) {
      await fs.remove(tmpDir)
    }
    return { success: true }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

/**
 * Get file list for a specific version directly from commit manifest.
 */
export async function getVersionFileList(
  repoPath: string,
  version: string
): Promise<{ success: boolean; files?: VersionFileEntry[]; message?: string }> {
  try {
    const commitPath = path.join(repoPath, 'commits', `${version}.json`)
    if (!(await fs.pathExists(commitPath))) {
      return { success: false, message: `Version ${version} not found` }
    }
    const commit = await fs.readJson(commitPath)
    return { success: true, files: commit.files || [] }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}

/**
 * Get file content from a specific version by reading blob directly.
 */
export async function getVersionFileContent(
  repoPath: string,
  version: string,
  filePath: string
): Promise<{ success: boolean; content?: string; message?: string }> {
  try {
    const commitPath = path.join(repoPath, 'commits', `${version}.json`)
    if (!(await fs.pathExists(commitPath))) {
      return { success: false, message: `Version ${version} not found` }
    }

    const commit = await fs.readJson(commitPath)
    const file = (commit.files || []).find(
      (f: { path: string }) => f.path === filePath
    )
    if (!file) {
      return { success: false, message: `File not found in version: ${filePath}` }
    }

    const blobPath = path.join(repoPath, 'objects', `${file.hash}.blob`)
    if (!(await fs.pathExists(blobPath))) {
      return { success: false, message: `Blob missing: ${file.hash}` }
    }

    const content = await fs.readFile(blobPath, 'utf-8')
    return { success: true, content }
  } catch (error) {
    return { success: false, message: String(error) }
  }
}
