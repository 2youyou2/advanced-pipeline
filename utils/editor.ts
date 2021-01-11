import { EDITOR as _EDITOR } from 'cc/env';
import { formatPath } from "./path";

export const EDITOR = _EDITOR;

export const cce = EDITOR && (window as any).cce;
export const io = EDITOR && (window as any).require('socket.io');
export const path = EDITOR && (window as any).require('path');
export const fse = EDITOR && (window as any).require('fs-extra');
export const base642arraybuffer = EDITOR && (window as any).require('base64-arraybuffer');
export const Sharp = EDITOR && (window as any).require('sharp');

export const Editor = EDITOR && (window as any).Editor;
export const projectPath = EDITOR && formatPath(Editor.Project.path);
export const projectAssetPath = EDITOR && formatPath(path.join(projectPath, 'assets'));
