export const uselogout = () => {
    const Logout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
    return {Logout}
};