-- Create project_applications table for "Apply to Project" feature
CREATE TABLE public.project_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(project_id, applicant_id)
);

-- Add is_public column to projects for open project discovery
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS looking_for TEXT[];
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget TEXT;

-- Create services table for Talent Marketplace
CREATE TABLE public.services (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT DEFAULT 'NGN',
    delivery_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service orders table
CREATE TABLE public.service_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    requirements TEXT,
    delivery_date TIMESTAMP WITH TIME ZONE,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table for Team/Studio Accounts
CREATE TABLE public.teams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team members table
CREATE TABLE public.team_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- Create external file links for Google Drive/Dropbox integration
CREATE TABLE public.external_file_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    added_by UUID NOT NULL,
    provider TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_file_links ENABLE ROW LEVEL SECURITY;

-- RLS for project_applications
CREATE POLICY "Users can view applications for their projects" ON public.project_applications
FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_applications.project_id AND projects.created_by = auth.uid())
    OR applicant_id = auth.uid()
);

CREATE POLICY "Users can apply to public projects" ON public.project_applications
FOR INSERT WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Project owners can update applications" ON public.project_applications
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_applications.project_id AND projects.created_by = auth.uid())
);

-- RLS for services
CREATE POLICY "Everyone can view active services" ON public.services
FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own services" ON public.services
FOR ALL USING (auth.uid() = seller_id);

-- RLS for service_orders
CREATE POLICY "Users can view their orders" ON public.service_orders
FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can create orders" ON public.service_orders
FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update their orders" ON public.service_orders
FOR UPDATE USING (seller_id = auth.uid());

-- RLS for teams
CREATE POLICY "Team members can view their teams" ON public.teams
FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM team_members WHERE team_members.team_id = teams.id AND team_members.user_id = auth.uid())
);

CREATE POLICY "Users can create teams" ON public.teams
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Team owners can update their teams" ON public.teams
FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Team owners can delete their teams" ON public.teams
FOR DELETE USING (auth.uid() = owner_id);

-- RLS for team_members
CREATE POLICY "Team members can view team members" ON public.team_members
FOR SELECT USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND (teams.owner_id = auth.uid() OR team_members.user_id = auth.uid()))
);

CREATE POLICY "Team owners can manage members" ON public.team_members
FOR ALL USING (
    EXISTS (SELECT 1 FROM teams WHERE teams.id = team_members.team_id AND teams.owner_id = auth.uid())
);

-- RLS for external_file_links
CREATE POLICY "Project members can view external links" ON public.external_file_links
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = external_file_links.project_id 
        AND (p.created_by = auth.uid() OR EXISTS (
            SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ))
    )
);

CREATE POLICY "Project members can add external links" ON public.external_file_links
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = external_file_links.project_id 
        AND (p.created_by = auth.uid() OR EXISTS (
            SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        ))
    )
);

CREATE POLICY "Link creators can delete their links" ON public.external_file_links
FOR DELETE USING (added_by = auth.uid());

-- Policy for public projects discovery
CREATE POLICY "Everyone can view public projects" ON public.projects
FOR SELECT USING (is_public = true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_project_applications_updated_at
BEFORE UPDATE ON public.project_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_orders_updated_at
BEFORE UPDATE ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();