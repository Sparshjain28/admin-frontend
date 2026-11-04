import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, ChevronDown } from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  role: string;
  branch_name?: string;
  status?: string;
}

interface TeamLeaderDropdownProps {
  onExecutiveSelect?: (executive: User) => void;
  className?: string;
}

export const TeamLeaderDropdown: React.FC<TeamLeaderDropdownProps> = ({
  onExecutiveSelect,
  className = ""
}) => {
  const [teamLeaders, setTeamLeaders] = useState<User[]>([]);
  const [executives, setExecutives] = useState<User[]>([]);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>('');
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch team leaders on component mount
  useEffect(() => {
    fetchTeamLeaders();
  }, []);

  const fetchTeamLeaders = async () => {
    try {
      const response = await fetch('http://localhost:3001/users/by-role?roles=team_leader', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamLeaders(data);
      }
    } catch (error) {
}
  };

  const fetchExecutives = async (leaderId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/users/team/${leaderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setExecutives(data.filter((user: User) => user.role === 'executive'));
      }
    } catch (error) {
setExecutives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderSelect = (leaderId: string) => {
    setSelectedLeaderId(leaderId);
    setSelectedExecutiveId('');
    setExecutives([]);
    if (leaderId) {
      fetchExecutives(leaderId);
    }
  };

  const handleExecutiveSelect = (executiveId: string) => {
    setSelectedExecutiveId(executiveId);
    const selectedExecutive = executives.find(exec => exec.id === executiveId);
    if (selectedExecutive && onExecutiveSelect) {
      onExecutiveSelect(selectedExecutive);
    }
  };

  const selectedLeader = teamLeaders.find(leader => leader.id === selectedLeaderId);
  const selectedExecutive = executives.find(exec => exec.id === selectedExecutiveId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Team Leader Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block text-gray-700">
          Select Team Leader
        </label>
        <Select value={selectedLeaderId} onValueChange={handleLeaderSelect}>
          <SelectTrigger className="w-full h-12 px-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {selectedLeader ? (
                <>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                      {selectedLeader.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{selectedLeader.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {selectedLeader.user_id} • {selectedLeader.branch_name || 'No Branch'}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    Team Leader
                  </Badge>
                </>
              ) : (
                <>
                  <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <SelectValue placeholder="Choose team leader..." />
                </>
              )}
            </div>
          </SelectTrigger>
          <SelectContent className="w-full">
            {teamLeaders.map((leader) => (
              <SelectItem key={leader.id} value={leader.id} className="p-3">
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                      {leader.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{leader.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {leader.user_id} • {leader.phone}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    Team Leader
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Executive Selection */}
      {selectedLeaderId && (
        <div>
          <label className="text-sm font-medium mb-2 block text-gray-700">
            Select Executive
            {loading && <span className="text-xs text-blue-500 ml-2">Loading...</span>}
          </label>
          <Select 
            value={selectedExecutiveId} 
            onValueChange={handleExecutiveSelect}
            disabled={loading || executives.length === 0}
          >
            <SelectTrigger className="w-full h-12 px-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedExecutive ? (
                  <>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-green-100 text-green-600">
                        {selectedExecutive.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{selectedExecutive.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {selectedExecutive.user_id} • {selectedExecutive.phone}
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs flex-shrink-0 bg-green-500">
                      Executive
                    </Badge>
                  </>
                ) : (
                  <>
                    <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <SelectValue 
                      placeholder={
                        loading ? "Loading executives..." : 
                        executives.length === 0 ? "No executives found" : 
                        "Choose executive..."
                      } 
                    />
                  </>
                )}
              </div>
            </SelectTrigger>
            <SelectContent className="w-full">
              {executives.map((executive) => (
                <SelectItem key={executive.id} value={executive.id} className="p-3">
                  <div className="flex items-center gap-3 w-full">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-green-100 text-green-600">
                        {executive.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{executive.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {executive.user_id} • {executive.phone}
                      </div>
                    </div>
                    <Badge variant="default" className="text-xs flex-shrink-0 bg-green-500">
                      Executive
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {executives.length === 0 && selectedLeaderId && !loading && (
            <p className="text-xs text-gray-500 mt-1">
              No executives found under this team leader
            </p>
          )}
        </div>
      )}
    </div>
  );
};
