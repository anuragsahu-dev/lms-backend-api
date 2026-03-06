import { DashboardService } from "./dashboard.service.js";
import { handleAsync } from "../../middlewares/error.middleware.js";
import { ApiResponse } from "../../utils/apiResponse.js";

export const getInstructorDashboard = handleAsync(async (req, res) => {
    const result = await DashboardService.getInstructorDashboard(req.userId);
    return new ApiResponse(200, result.message, result.data).send(res);
});

export const getStudentDashboard = handleAsync(async (req, res) => {
    const result = await DashboardService.getStudentDashboard(req.userId);
    return new ApiResponse(200, result.message, result.data).send(res);
});
