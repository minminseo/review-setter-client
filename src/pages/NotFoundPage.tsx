import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
            <h1 className="text-6xl font-bold text-destructive">404</h1>
            <p className="text-xl mt-4 mb-8 text-muted-foreground">
                {t('error.pageNotFound')}
            </p>
            <Button asChild>
                <Link to="/">{t('error.backToHome')}</Link>
            </Button>
        </div>
    );
};

export default NotFoundPage;