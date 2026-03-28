import { Outlet } from 'react-router-dom';
import { useAuthTexts, useAuthLanguageStore } from '@/store/authLanguageStore';
import { QuestionMarkCircleIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AuthLayout = () => {
    // 未ログイン時専用の言語状態管理からテキストを取得
    const texts = useAuthTexts();
    const language = useAuthLanguageStore((state) => state.language);

    const handleContactClick = () => {
        const contactUrl = language === 'ja'
            ? 'https://docs.google.com/forms/d/e/1FAIpQLSfFw5rrigVARCM_B8T_dCaZagSenX-xjp41QUkqW2IncrgVEA/viewform?usp=header'
            : 'https://docs.google.com/forms/d/e/1FAIpQLSf42zxGjMQaIahXiF-1XB7hI3Dz8V4xvRrRHdYDTJL4EXCvVg/viewform?usp=header';
        window.open(contactUrl, '_blank');
    };

    return (
        <div className="relative flex min-h-screen w-full">
            <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-muted p-10">
                <h1 className="text-3xl font-bold text-foreground/80">
                    {texts.serviceTitle}
                </h1>
            </div>

            <div className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* ここにLoginPageやSignupPageなどのコンポーネントが描画される */}
                    <Outlet />
                </div>
            </div>

            <div className="fixed bottom-6 right-6 z-50">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="h-10 px-4 rounded-full shadow-md bg-background border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground transition-all flex items-center gap-2 group"
                                onClick={handleContactClick}
                            >
                                <QuestionMarkCircleIcon className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                <span className="text-sm font-medium">{texts.contact}</span>
                                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-muted-foreground/60" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-popover text-popover-foreground border shadow-sm">
                            <p>{texts.contact}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};

export default AuthLayout;