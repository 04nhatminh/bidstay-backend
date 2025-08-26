const StatisticsModel = require('../models/statisticsModel');

// Thống kê tổng quan
const getDashboardStats = async (req, res) => {
    try {
        const totalStats = await StatisticsModel.getTotalStats();
        const bookingByStatus = await StatisticsModel.getBookingByStatus();
        const productsByType = await StatisticsModel.getProductsByType();
        const auctionByStatus = await StatisticsModel.getAuctionByStatus();

        res.json({
            success: true,
            data: {
                totalStats,
                bookingByStatus,
                productsByType,
                auctionByStatus
            }
        });
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê dashboard',
            error: error.message
        });
    }
};

// Thống kê doanh thu theo thời gian
const getRevenueStats = async (req, res) => {
    try {
        const { period = 'month', year = new Date().getFullYear() } = req.query;

        let revenueData;

        if (period === 'day') {
            // Thống kê theo ngày trong tháng hiện tại
            const currentMonth = new Date().getMonth() + 1;
            revenueData = await StatisticsModel.getRevenueByDay(year, currentMonth);
        } else if (period === 'month') {
            // Thống kê theo tháng trong năm
            revenueData = await StatisticsModel.getRevenueByMonth(year);
        } else if (period === 'year') {
            // Thống kê theo năm
            revenueData = await StatisticsModel.getRevenueByYear();
        }

        res.json({ success: true, data: revenueData });

    } catch (error) {
        console.error('Error getting revenue stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê doanh thu',
            error: error.message
        });
    }
};

// Thống kê khách hàng
const getCustomerStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        const newCustomers = await StatisticsModel.getNewCustomersByMonth(currentYear);
        const topCustomers = await StatisticsModel.getTopCustomers();
        const usersByStatus = await StatisticsModel.getUsersByStatus();

        res.json({
            success: true,
            data: {
                newCustomers,
                topCustomers,
                usersByStatus
            }
        });
    } catch (error) {
        console.error('Error getting customer stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê khách hàng',
            error: error.message
        });
    }
};

// Thống kê sản phẩm
const getProductStats = async (req, res) => {
    try {
        const topProducts = await StatisticsModel.getTopProducts();
        const productsByProvince = await StatisticsModel.getProductsByProvince();
        const avgPriceByType = await StatisticsModel.getAvgPriceByType();

        res.json({
            success: true,
            data: {
                topProducts,
                productsByProvince,
                avgPriceByType
            }
        });
    } catch (error) {
        console.error('Error getting product stats:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy thống kê sản phẩm',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getRevenueStats,
    getCustomerStats,
    getProductStats
};