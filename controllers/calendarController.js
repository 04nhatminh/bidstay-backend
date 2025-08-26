// controllers/calendarController.js
const productModel = require('../models/productModel');     // export new ProductModel()
const calendarModel = require('../models/calendarModel');   // export new CalendarModel()
const db = require('../config/database');

class CalendarController {
    // GET /api/calendar/check?uid=...&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD
    async checkAvailability(req, res) {
        try {
            const { uid, checkin, checkout, userId } = req.query;
            if (!uid || !checkin || !checkout) {
                return res.status(400).json({ message: 'Thiếu tham số: uid, checkin, checkout' });
            }

            const productId = await productModel.findProductIdByUID(uid);
            if (!productId) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
            }

            // dọn reserved hết hạn (nếu bạn đã đổi sang NOW()/UTC_TIMESTAMP() thì gọi hàm tương ứng)
            await calendarModel.releaseExpiredHolds(new Date());

            // kiểm tra xung đột trong khoảng (booked/blocked/reserved)
            const conflict = await calendarModel.isRangeAvailable(productId, checkin, checkout);
            const days = await calendarModel.getRange(productId, checkin, checkout);

            // phát hiện auction trong khoảng
            const hasAuction = Array.isArray(days) && days.some(d => d.AuctionID);

            // xác định giữ chỗ thuộc về user này không
            let reservedBySelf = false;
            if (userId && Array.isArray(days)) {
                const holdBookingIds = [...new Set(days
                    .filter(d => d.Status === 'reserved' && d.BookingID)
                    .map(d => d.BookingID))];
                if (holdBookingIds.length) {
                    const [rows] = await db.query(
                        `SELECT COUNT(*) AS cnt FROM Booking WHERE BookingID IN (?) AND UserID = ?`,
                        [holdBookingIds, Number(userId)]
                    );
                    reservedBySelf = rows[0]?.cnt > 0;
                }
            }

            if (conflict && conflict.available === false) {
                    const reason = (conflict.reason === 'booked' || conflict.reason === 'blocked') ? conflict.reason : 'reserved';
                    return res.json({ available: false, reason, reservedBySelf, hasAuction, days });
                }

            // nếu không có xung đột
            return res.json({ available: true, reason: null, reservedBySelf: false, hasAuction, days });
        } catch (error) {
            console.error('[CalendarController.checkAvailability]', error);
            return res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }

    // POST /api/calendar/block
    // body: { uid, start, end, reason? }
    async blockRange(req, res) {
        try {
            const { uid, start, end, reason = 'manual' } = req.body || {};
            if (!uid || !start || !end) {
                return res.status(400).json({ message: 'Thiếu tham số: uid, start, end' });
            }

            const productId = await productModel.findProductIdByUID(uid);
            if (!productId) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

            await calendarModel.setRangeStatus(productId, start, end, { status: 'blocked', lockReason: reason });
            return res.json({ ok: true });
        } catch (error) {
            console.error('[CalendarController.blockRange]', error);
            return res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }

    // POST /api/calendar/reserve
    // body: { uid, start, end, bookingId, holdMinutes? }
    async reserveRange(req, res) {
        try {
            const { uid, start, end, bookingId, holdMinutes = 30 } = req.body || {};
            if (!uid || !start || !end || !bookingId) {
                return res.status(400).json({ message: 'Thiếu tham số: uid, start, end, bookingId' });
            }

            const productId = await productModel.findProductIdByUID(uid);
            if (!productId) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

            const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
            await calendarModel.setRangeStatus(productId, start, end, {
                status: 'reserved',
                lockReason: 'booking_hold',
                bookingId,
                holdExpiresAt,
            });

            return res.json({ ok: true, holdExpiresAt });
        } catch (error) {
            console.error('[CalendarController.reserveRange]', error);
            return res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }

    // POST /api/calendar/release-expired-holds
    async releaseExpiredHolds(_req, res) {
        try {
            const released = await calendarModel.releaseExpiredHolds(new Date());
            return res.json({ released });
        } catch (error) {
            console.error('[CalendarController.releaseExpiredHolds]', error);
            return res.status(500).json({ message: 'Lỗi server', error: error.message });
        }
    }
}

module.exports = new CalendarController();
