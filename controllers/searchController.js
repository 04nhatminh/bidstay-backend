const SearchModel = require("../models/searchModel");

exports.searchRooms = async (req, res) => {
  try {
    const {
      province,
      district,
      checkin,
      checkout,
      guests,
      sort,
      price_min,
      price_max,
      room_types,
      rating,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Gọi model để lấy dữ liệu
    const products = await SearchModel.searchRooms({
      province,
      district,
      checkin,
      checkout,
      guests,
      sort,
      price_min,
      price_max,
      room_types,
      rating,
      limit: numericLimit,
      offset
    });

    // Đếm tổng số records để tính pagination
    const totalProducts = await SearchModel.countSearchRooms({
      province,
      district,
      checkin,
      checkout,
      guests,
      sort,
      price_min,
      price_max,
      room_types,
      rating
    });

    // Tính pagination
    const totalPages = Math.ceil(totalProducts / numericLimit);
    const pagination = {
      currentPage: numericPage,
      totalPages,
      totalItems: totalProducts,
      itemsPerPage: numericLimit
    };

    res.json({
      success: true,
      data: {
        products,
        pagination
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      message: err.message 
    });
  }
};

exports.searchAuctions = async (req, res) => {
  try {
    const {
      province,
      district,
      status = 'active',
      sort,
      price_min,
      price_max,
      room_types,
      auction_types,
      rating,
      page = 1,
      limit = 20
    } = req.query;

    const offset = (page - 1) * limit;
    const numericLimit = parseInt(limit);
    const numericPage = parseInt(page);

    // Gọi model để lấy dữ liệu auctions
    const auctions = await SearchModel.searchAuctions({
      province,
      district,
      status,
      sort,
      price_min,
      price_max,
      room_types,
      auction_types,
      rating,
      limit: numericLimit,
      offset
    });

    // Đếm tổng số records để tính pagination
    const totalAuctions = await SearchModel.countSearchAuctions({
      province,
      district,
      status,
      price_min,
      price_max,
      room_types,
      rating
    });

    // Tính pagination
    const totalPages = Math.ceil(totalAuctions / numericLimit);
    const pagination = {
      currentPage: numericPage,
      totalPages,
      totalItems: totalAuctions,
      itemsPerPage: numericLimit
    };

    res.json({
      success: true,
      data: {
        auctions,
        pagination
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      error: "Server error",
      message: err.message 
    });
  }
};
