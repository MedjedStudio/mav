/**
 * 画像サムネイル表示ユーティリティ
 */

/**
 * サムネイルURLを取得する
 * @param {string} originalUrl - 元画像のURL
 * @param {string} size - サムネイルサイズ ('small', 'medium', 'large')
 * @returns {string} サムネイルURL
 */
export function getThumbnailUrl(originalUrl, size = 'medium') {
  if (!originalUrl || !isImageFile(originalUrl)) {
    return originalUrl;
  }

  // サイズマッピング
  const sizeMap = {
    'small': 's',
    'medium': 'm', 
    'large': 'l'
  };

  const sizeSuffix = sizeMap[size];
  if (!sizeSuffix) {
    return originalUrl;
  }

  // URLから拡張子を取得
  const url = new URL(originalUrl, window.location.origin);
  const pathParts = url.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  
  // ファイル名からサムネイル名を生成
  const thumbnailFilename = generateThumbnailFilename(filename, sizeSuffix);
  
  // パスを置き換え
  pathParts[pathParts.length - 1] = thumbnailFilename;
  url.pathname = pathParts.join('/');
  
  return url.toString();
}

/**
 * サムネイルファイル名を生成する
 * @param {string} originalFilename - 元ファイル名
 * @param {string} sizeSuffix - サイズサフィックス ('s', 'm', 'l')
 * @returns {string} サムネイルファイル名
 */
function generateThumbnailFilename(originalFilename, sizeSuffix) {
  const lastDotIndex = originalFilename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalFilename}_${sizeSuffix}`;
  }
  
  const name = originalFilename.substring(0, lastDotIndex);
  const extension = originalFilename.substring(lastDotIndex);
  
  // 大サイズは常に.jpg
  if (sizeSuffix === 'l') {
    return `${name}_${sizeSuffix}.jpg`;
  } else {
    return `${name}_${sizeSuffix}${extension}`;
  }
}

/**
 * 画像ファイルかどうかを判定する
 * @param {string} filename - ファイル名またはURL
 * @returns {boolean} 画像ファイルの場合true
 */
function isImageFile(filename) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const extension = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(extension);
}

/**
 * ファイル拡張子を取得する
 * @param {string} filename - ファイル名またはURL
 * @returns {string} 拡張子
 */
function getFileExtension(filename) {
  const url = filename.includes('://') ? new URL(filename).pathname : filename;
  const lastDotIndex = url.lastIndexOf('.');
  return lastDotIndex !== -1 ? url.substring(lastDotIndex) : '';
}

/**
 * サムネイル画像コンポーネント用のProps
 * @param {string} src - 元画像URL 
 * @param {string} size - サイズ ('small', 'medium', 'large')
 * @param {Object} props - その他のimg属性
 * @returns {Object} img要素用のprops
 */
export function createThumbnailProps(src, size = 'medium', props = {}) {
  const thumbnailUrl = getThumbnailUrl(src, size);
  
  return {
    ...props,
    src: thumbnailUrl,
    onError: (e) => {
      // サムネイルの読み込みに失敗した場合は元画像にフォールバック
      if (e.target.src !== src) {
        e.target.src = src;
      }
      // 元のonErrorハンドラーがあれば実行
      if (props.onError) {
        props.onError(e);
      }
    }
  };
}