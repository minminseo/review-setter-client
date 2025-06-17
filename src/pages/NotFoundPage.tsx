import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/**
 * 定義されたURL以外のパスにアクセスした際に表示される404 Not Foundページ
 */
const NotFoundPage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
            <h1 className="text-6xl font-bold text-destructive">404</h1>
            <p className="text-xl mt-4 mb-8 text-muted-foreground">
                お探しのページは見つかりませんでした。
            </p>
            {/* ホーム画面に戻るためのリンク付きボタン */}
            <Button asChild>
                <Link to="/">ホームに戻る</Link>
            </Button>
        </div>
    );
};

export default NotFoundPage;