import { Outlet } from 'react-router-dom';

const FullScreenLayout = () => {
    return (
        <div className="flex min-h-screen w-full items-center justify-center p-6">
            <div className="w-full max-w-md">
                <Outlet />
            </div>
        </div>
    );
};

export default FullScreenLayout;