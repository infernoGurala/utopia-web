export class GasAttendanceService {
  static API_URL = 'https://script.google.com/macros/s/AKfycbxqx-c3QUpIgJjjSMGLnIRA18o0csTeN2Jk3M7IyvA_Q-WJcLDwA_3rv2fpaN8xzKikjA/exec';

  /**
   * Fetch attendance data from the GAS endpoint
   * @param {string} rollNumber 
   * @param {string} password 
   * @param {string} college - 'aus' or 'acet'
   * @returns {Promise<Object>} { studentName, overallPercentage, totalClasses, totalAttended, subjects }
   */
  static async fetchAttendance(rollNumber, password, college = 'aus') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const url = new URL(this.API_URL);
      url.searchParams.append('rollNumber', rollNumber);
      url.searchParams.append('password', password);
      url.searchParams.append('college', college.toLowerCase());

      const response = await fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json();
      
      if (!json.ok) {
        throw new Error(json.error || 'Failed to fetch attendance');
      }

      return json.data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Connection timed out. Please try again.');
      }
      throw error;
    }
  }
}
