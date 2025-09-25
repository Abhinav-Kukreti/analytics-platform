import { API_BASE_URL } from './config';

class UserService {
  // Get user profile with permissions
  async getUserProfile(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error('Failed to get user profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ userId, updates })
      });

      if (!response.ok) {
        throw new Error('Failed to update user profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Get team members
  async getTeamMembers(tenantId) {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/${tenantId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get team members');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting team members:', error);
      throw error;
    }
  }

  // Send team invitation
  async inviteUser({ email, role, tenantId, inviterName, companyName }) {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ email, role, tenantId, inviterName, companyName })
      });

      if (!response.ok) {
        throw new Error('Failed to send invitation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }

  // Accept invitation
  async acceptInvitation(invitationId, userInfo) {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/accept-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invitationId, userInfo })
      });

      if (!response.ok) {
        throw new Error('Failed to accept invitation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  // Get audit logs
  async getAuditLogs(tenantId, options = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (options.limit) queryParams.append('limit', options.limit);
      if (options.startDate) queryParams.append('startDate', options.startDate);
      if (options.endDate) queryParams.append('endDate', options.endDate);

      const response = await fetch(
        `${API_BASE_URL}/audit/${tenantId}/logs?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get audit logs');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting audit logs:', error);
      throw error;
    }
  }

  // Get audit statistics
  async getAuditStats(tenantId) {
    try {
      const response = await fetch(`${API_BASE_URL}/audit/${tenantId}/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get audit stats');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting audit stats:', error);
      throw error;
    }
  }

  // Check user permissions
  hasPermission(userPermissions, requiredPermission) {
    return userPermissions && userPermissions.includes(requiredPermission);
  }

  // Get role display info
  getRoleInfo(role) {
    const roles = {
      ADMIN: {
        name: 'Administrator',
        color: 'red',
        description: 'Full access to all features and settings'
      },
      ANALYST: {
        name: 'Analyst',
        color: 'blue',
        description: 'Can view and analyze data, create reports'
      },
      VIEWER: {
        name: 'Viewer',
        color: 'green',
        description: 'Read-only access to dashboards and reports'
      }
    };

    return roles[role] || roles.VIEWER;
  }
}

export default new UserService();
