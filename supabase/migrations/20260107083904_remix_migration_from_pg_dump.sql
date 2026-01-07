CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'user',
    'admin',
    'master_admin',
    'super_admin'
);


--
-- Name: collaboration_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.collaboration_status AS ENUM (
    'pending',
    'active',
    'completed',
    'cancelled'
);


--
-- Name: creative_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.creative_role AS ENUM (
    'musician',
    'producer',
    'songwriter',
    'performer',
    'dancer',
    'vixen',
    'actor',
    'director',
    'screenwriter',
    'designer',
    'photographer',
    'videographer',
    'promoter',
    'manager',
    'strategist'
);


--
-- Name: genre; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.genre AS ENUM (
    'afrobeats',
    'hip_hop',
    'rnb',
    'gospel',
    'pop',
    'reggae',
    'dancehall',
    'amapiano',
    'highlife',
    'fuji',
    'juju',
    'other'
);


--
-- Name: assign_admin_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_admin_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Check if user signed up through admin portal (has is_admin_signup metadata)
  IF NEW.raw_user_meta_data->>'is_admin_signup' = 'true' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: assign_default_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_default_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;


--
-- Name: can_see_user(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_see_user(_viewer_id uuid, _target_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _target_id AND role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _viewer_id AND role = 'super_admin'
  )
$$;


--
-- Name: check_mutual_like(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_mutual_like() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  mutual_like BOOLEAN;
  user1 UUID;
  user2 UUID;
BEGIN
  IF NEW.liked = TRUE THEN
    SELECT EXISTS (
      SELECT 1 FROM public.swipes
      WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND liked = TRUE
    ) INTO mutual_like;
    
    IF mutual_like THEN
      IF NEW.swiper_id < NEW.swiped_id THEN
        user1 := NEW.swiper_id;
        user2 := NEW.swiped_id;
      ELSE
        user1 := NEW.swiped_id;
        user2 := NEW.swiper_id;
      END IF;
      
      INSERT INTO public.matches (user_id_1, user_id_2)
      VALUES (user1, user2)
      ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: create_conversation_on_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_conversation_on_match() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.conversations (match_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'super_admin' THEN 4
    WHEN 'master_admin' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'user' THEN 1
  END DESC
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8))
  );
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: notify_new_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_match() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES 
    (NEW.user_id_1, 'match', 'New Match!', 'You have a new creative match!', jsonb_build_object('match_id', NEW.id, 'matched_user', NEW.user_id_2)),
    (NEW.user_id_2, 'match', 'New Match!', 'You have a new creative match!', jsonb_build_object('match_id', NEW.id, 'matched_user', NEW.user_id_1));
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  conv_match_id UUID;
  other_user_id UUID;
BEGIN
  SELECT match_id INTO conv_match_id FROM public.conversations WHERE id = NEW.conversation_id;
  
  SELECT CASE 
    WHEN m.user_id_1 = NEW.sender_id THEN m.user_id_2 
    ELSE m.user_id_1 
  END INTO other_user_id
  FROM public.matches m WHERE m.id = conv_match_id;
  
  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (other_user_id, 'message', 'New Message', 'You have a new message', jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id));
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_notify_new_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_notify_new_match() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- The existing notify_new_match function already handles user notifications
  -- This trigger will also invoke the edge function for admin notifications
  PERFORM net.http_post(
    url := 'https://jltzghoyprofzteioocb.supabase.co/functions/v1/notify-new-match',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsdHpnaG95cHJvZnp0ZWlvb2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Njc4MjEsImV4cCI6MjA3NzU0MzgyMX0.T4L9y84GVFPM6h8v0Ys7CzcRRkBI7uaTvnR6P2vOCTw"}'::jsonb,
    body := jsonb_build_object('matchId', NEW.id)
  );
  RETURN NEW;
END;
$$;


--
-- Name: trigger_notify_new_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_notify_new_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  conv_match_id UUID;
  other_user_id UUID;
BEGIN
  SELECT match_id INTO conv_match_id FROM public.conversations WHERE id = NEW.conversation_id;
  
  SELECT CASE 
    WHEN m.user_id_1 = NEW.sender_id THEN m.user_id_2 
    ELSE m.user_id_1 
  END INTO other_user_id
  FROM public.matches m WHERE m.id = conv_match_id;
  
  -- Insert notification for the recipient
  INSERT INTO public.user_notifications (user_id, type, title, message, data)
  VALUES (other_user_id, 'message', 'New Message', 'You have a new message', jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id));
  
  RETURN NEW;
END;
$$;


--
-- Name: trigger_notify_suspension(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_notify_suspension() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://jltzghoyprofzteioocb.supabase.co/functions/v1/notify-critical-action',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsdHpnaG95cHJvZnp0ZWlvb2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Njc4MjEsImV4cCI6MjA3NzU0MzgyMX0.T4L9y84GVFPM6h8v0Ys7CzcRRkBI7uaTvnR6P2vOCTw"}'::jsonb,
    body := jsonb_build_object('actionType', 'suspension', 'userId', NEW.user_id, 'suspendedBy', NEW.suspended_by, 'reason', NEW.reason)
  );
  RETURN NEW;
END;
$$;


--
-- Name: trigger_notify_verification_request(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_notify_verification_request() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://jltzghoyprofzteioocb.supabase.co/functions/v1/notify-verification-request',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsdHpnaG95cHJvZnp0ZWlvb2NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5Njc4MjEsImV4cCI6MjA3NzU0MzgyMX0.T4L9y84GVFPM6h8v0Ys7CzcRRkBI7uaTvnR6P2vOCTw"}'::jsonb,
    body := jsonb_build_object('requestId', NEW.id, 'userId', NEW.user_id)
  );
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action_type text NOT NULL,
    target_user_id uuid,
    target_user_name text,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_admin_id uuid NOT NULL,
    sender_admin_id uuid,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_data jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    updated_by uuid,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: featured_creatives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.featured_creatives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    featured_by uuid,
    reason text,
    is_active boolean DEFAULT true,
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id_1 uuid NOT NULL,
    user_id_2 uuid NOT NULL,
    matched_at timestamp with time zone DEFAULT now(),
    CONSTRAINT matches_check CHECK ((user_id_1 < user_id_2))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: portfolio_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    media_type text NOT NULL,
    media_url text NOT NULL,
    thumbnail_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT portfolio_items_media_type_check CHECK ((media_type = ANY (ARRAY['audio'::text, 'video'::text, 'image'::text, 'document'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    username text NOT NULL,
    bio text,
    location text,
    avatar_url text,
    cover_image_url text,
    social_links jsonb DEFAULT '{}'::jsonb,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    uploaded_by uuid NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_members (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text,
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    assigned_to uuid,
    status text DEFAULT 'pending'::text,
    priority text DEFAULT 'medium'::text,
    due_date timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    status public.collaboration_status DEFAULT 'pending'::public.collaboration_status,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: revenue_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.revenue_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'NGN'::text,
    status text DEFAULT 'completed'::text,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: scheduled_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_type text NOT NULL,
    frequency text NOT NULL,
    recipients jsonb NOT NULL,
    last_sent timestamp with time zone,
    next_scheduled timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT scheduled_reports_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: studio_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    timestamp_seconds numeric(10,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: swipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.swipes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    swiper_id uuid NOT NULL,
    swiped_id uuid NOT NULL,
    liked boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_creative_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_creative_roles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role public.creative_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_genres; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_genres (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    genre public.genre NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    last_active timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: user_suspensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_suspensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    suspended_by uuid NOT NULL,
    reason text NOT NULL,
    suspension_type text NOT NULL,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT user_suspensions_suspension_type_check CHECK ((suspension_type = ANY (ARRAY['temporary'::text, 'permanent'::text])))
);


--
-- Name: verification_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    request_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    verification_data jsonb,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT verification_requests_request_type_check CHECK ((request_type = ANY (ARRAY['artist'::text, 'producer'::text, 'label'::text]))),
    CONSTRAINT verification_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: featured_creatives featured_creatives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_creatives
    ADD CONSTRAINT featured_creatives_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: matches matches_user_id_1_user_id_2_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user_id_1_user_id_2_key UNIQUE (user_id_1, user_id_2);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: portfolio_items portfolio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- Name: project_files project_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: project_tasks project_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: revenue_transactions revenue_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT revenue_transactions_pkey PRIMARY KEY (id);


--
-- Name: scheduled_reports scheduled_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_reports
    ADD CONSTRAINT scheduled_reports_pkey PRIMARY KEY (id);


--
-- Name: studio_feedback studio_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_feedback
    ADD CONSTRAINT studio_feedback_pkey PRIMARY KEY (id);


--
-- Name: swipes swipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_pkey PRIMARY KEY (id);


--
-- Name: swipes swipes_swiper_id_swiped_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_swiper_id_swiped_id_key UNIQUE (swiper_id, swiped_id);


--
-- Name: user_creative_roles user_creative_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_creative_roles
    ADD CONSTRAINT user_creative_roles_pkey PRIMARY KEY (id);


--
-- Name: user_creative_roles user_creative_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_creative_roles
    ADD CONSTRAINT user_creative_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_genres user_genres_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genres
    ADD CONSTRAINT user_genres_pkey PRIMARY KEY (id);


--
-- Name: user_genres user_genres_user_id_genre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genres
    ADD CONSTRAINT user_genres_user_id_genre_key UNIQUE (user_id, genre);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_suspensions user_suspensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_suspensions
    ADD CONSTRAINT user_suspensions_pkey PRIMARY KEY (id);


--
-- Name: verification_requests verification_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_admin_id ON public.activity_logs USING btree (admin_id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_admin_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_read ON public.admin_notifications USING btree (is_read);


--
-- Name: idx_admin_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_recipient ON public.admin_notifications USING btree (recipient_admin_id);


--
-- Name: idx_user_sessions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_active ON public.user_sessions USING btree (is_active);


--
-- Name: idx_user_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);


--
-- Name: idx_user_suspensions_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_suspensions_active ON public.user_suspensions USING btree (is_active);


--
-- Name: idx_user_suspensions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_suspensions_user_id ON public.user_suspensions USING btree (user_id);


--
-- Name: idx_verification_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_requests_status ON public.verification_requests USING btree (status);


--
-- Name: idx_verification_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_requests_user_id ON public.verification_requests USING btree (user_id);


--
-- Name: matches on_match_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_match_created AFTER INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION public.create_conversation_on_match();


--
-- Name: matches on_new_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_match AFTER INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION public.notify_new_match();


--
-- Name: matches on_new_match_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_match_notify AFTER INSERT ON public.matches FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_new_match();


--
-- Name: messages on_new_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();


--
-- Name: messages on_new_message_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_new_message_notify AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_new_message();


--
-- Name: swipes on_swipe_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_swipe_created AFTER INSERT ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.check_mutual_like();


--
-- Name: user_suspensions on_user_suspension; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_user_suspension AFTER INSERT ON public.user_suspensions FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_suspension();


--
-- Name: verification_requests on_verification_request; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_verification_request AFTER INSERT ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.trigger_notify_verification_request();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: portfolio_items update_portfolio_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_portfolio_items_updated_at BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: verification_requests update_verification_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON public.verification_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversations conversations_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: featured_creatives featured_creatives_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.featured_creatives
    ADD CONSTRAINT featured_creatives_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_user_id_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user_id_1_fkey FOREIGN KEY (user_id_1) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: matches matches_user_id_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_user_id_2_fkey FOREIGN KEY (user_id_2) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: portfolio_items portfolio_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_files project_files_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_files
    ADD CONSTRAINT project_files_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: project_tasks project_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users(id);


--
-- Name: project_tasks project_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_tasks
    ADD CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: revenue_transactions revenue_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.revenue_transactions
    ADD CONSTRAINT revenue_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: studio_feedback studio_feedback_portfolio_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_feedback
    ADD CONSTRAINT studio_feedback_portfolio_item_id_fkey FOREIGN KEY (portfolio_item_id) REFERENCES public.portfolio_items(id) ON DELETE CASCADE;


--
-- Name: swipes swipes_swiped_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_swiped_id_fkey FOREIGN KEY (swiped_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: swipes swipes_swiper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_swiper_id_fkey FOREIGN KEY (swiper_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_creative_roles user_creative_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_creative_roles
    ADD CONSTRAINT user_creative_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_genres user_genres_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_genres
    ADD CONSTRAINT user_genres_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_suspensions user_suspensions_suspended_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_suspensions
    ADD CONSTRAINT user_suspensions_suspended_by_fkey FOREIGN KEY (suspended_by) REFERENCES auth.users(id);


--
-- Name: user_suspensions user_suspensions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_suspensions
    ADD CONSTRAINT user_suspensions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: verification_requests verification_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: verification_requests verification_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_requests
    ADD CONSTRAINT verification_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_suspensions Admins can create suspensions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create suspensions" ON public.user_suspensions FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: user_roles Admins can create users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create users" ON public.user_roles FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (role = 'user'::public.app_role)));


--
-- Name: featured_creatives Admins can manage featured creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage featured creatives" ON public.featured_creatives USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: user_suspensions Admins can update suspensions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update suspensions" ON public.user_suspensions FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: admin_notifications Admins can update their notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their notifications" ON public.admin_notifications FOR UPDATE USING ((auth.uid() = recipient_admin_id));


--
-- Name: verification_requests Admins can update verification requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update verification requests" ON public.verification_requests FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: activity_logs Admins can view activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view activity logs" ON public.activity_logs FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: user_sessions Admins can view all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sessions" ON public.user_sessions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: verification_requests Admins can view all verification requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all verification requests" ON public.verification_requests FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: revenue_transactions Admins can view revenue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view revenue" ON public.revenue_transactions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: admin_settings Admins can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view settings" ON public.admin_settings FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: user_suspensions Admins can view suspensions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view suspensions" ON public.user_suspensions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: admin_notifications Admins can view their notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their notifications" ON public.admin_notifications FOR SELECT USING ((auth.uid() = recipient_admin_id));


--
-- Name: user_roles Admins can view user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view user roles" ON public.user_roles FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (role = 'user'::public.app_role)));


--
-- Name: studio_feedback Authenticated users can add feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add feedback" ON public.studio_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: featured_creatives Everyone can view featured creatives; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view featured creatives" ON public.featured_creatives FOR SELECT USING ((is_active = true));


--
-- Name: studio_feedback Everyone can view feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view feedback" ON public.studio_feedback FOR SELECT USING (true);


--
-- Name: user_roles Master admins can create admins and users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master admins can create admins and users" ON public.user_roles FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'master_admin'::public.app_role) AND (role = ANY (ARRAY['admin'::public.app_role, 'user'::public.app_role]))));


--
-- Name: user_roles Master admins can delete admin and user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master admins can delete admin and user roles" ON public.user_roles FOR DELETE USING ((public.has_role(auth.uid(), 'master_admin'::public.app_role) AND (role = ANY (ARRAY['admin'::public.app_role, 'user'::public.app_role]))));


--
-- Name: user_roles Master admins can update admin and user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master admins can update admin and user roles" ON public.user_roles FOR UPDATE USING ((public.has_role(auth.uid(), 'master_admin'::public.app_role) AND (role = ANY (ARRAY['admin'::public.app_role, 'user'::public.app_role]))));


--
-- Name: user_roles Master admins can view non-super-admin roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Master admins can view non-super-admin roles" ON public.user_roles FOR SELECT USING ((public.has_role(auth.uid(), 'master_admin'::public.app_role) AND (role <> 'super_admin'::public.app_role)));


--
-- Name: portfolio_items Portfolio items are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Portfolio items are viewable by everyone" ON public.portfolio_items FOR SELECT USING (true);


--
-- Name: profiles Profiles are viewable based on role visibility; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Profiles are viewable based on role visibility" ON public.profiles FOR SELECT USING (public.can_see_user(auth.uid(), id));


--
-- Name: project_members Project creators can add members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project creators can add members" ON public.project_members FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_members.project_id) AND (p.created_by = auth.uid())))));


--
-- Name: projects Project creators can update their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project creators can update their projects" ON public.projects FOR UPDATE USING ((auth.uid() = created_by));


--
-- Name: project_members Project members are viewable by project members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project members are viewable by project members" ON public.project_members FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_members.project_id) AND ((p.created_by = auth.uid()) OR (project_members.user_id = auth.uid()))))));


--
-- Name: project_tasks Project members can create tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project members can create tasks" ON public.project_tasks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_tasks.project_id) AND ((p.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.project_members pm
          WHERE ((pm.project_id = p.id) AND (pm.user_id = auth.uid())))))))));


--
-- Name: project_tasks Project members can update tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project members can update tasks" ON public.project_tasks FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_tasks.project_id) AND ((p.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.project_members pm
          WHERE ((pm.project_id = p.id) AND (pm.user_id = auth.uid())))))))));


--
-- Name: project_files Project members can upload files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project members can upload files" ON public.project_files FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_files.project_id) AND ((p.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.project_members pm
          WHERE ((pm.project_id = p.id) AND (pm.user_id = auth.uid())))))))));


--
-- Name: project_files Project members can view files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project members can view files" ON public.project_files FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_files.project_id) AND ((p.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.project_members pm
          WHERE ((pm.project_id = p.id) AND (pm.user_id = auth.uid())))))))));


--
-- Name: project_tasks Project members can view tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project members can view tasks" ON public.project_tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = project_tasks.project_id) AND ((p.created_by = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.project_members pm
          WHERE ((pm.project_id = p.id) AND (pm.user_id = auth.uid())))))))));


--
-- Name: projects Projects are viewable by members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Projects are viewable by members" ON public.projects FOR SELECT USING (((auth.uid() = created_by) OR (EXISTS ( SELECT 1
   FROM public.project_members pm
  WHERE ((pm.project_id = pm.id) AND (pm.user_id = auth.uid()))))));


--
-- Name: user_roles Super admins can delete any role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can delete any role" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: user_roles Super admins can insert any role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can insert any role" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: scheduled_reports Super admins can manage reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage reports" ON public.scheduled_reports USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: admin_settings Super admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage settings" ON public.admin_settings USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: user_roles Super admins can update any role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can update any role" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: user_roles Super admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: conversations System can create conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create conversations" ON public.conversations FOR INSERT WITH CHECK (true);


--
-- Name: matches System can create matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create matches" ON public.matches FOR INSERT WITH CHECK (true);


--
-- Name: admin_notifications System can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create notifications" ON public.admin_notifications FOR INSERT WITH CHECK (true);


--
-- Name: user_notifications System can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create notifications" ON public.user_notifications FOR INSERT WITH CHECK (true);


--
-- Name: revenue_transactions System can create revenue records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create revenue records" ON public.revenue_transactions FOR INSERT WITH CHECK (true);


--
-- Name: activity_logs System can insert activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);


--
-- Name: user_sessions System can manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage sessions" ON public.user_sessions USING (true) WITH CHECK (true);


--
-- Name: user_genres User genres are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User genres are viewable by everyone" ON public.user_genres FOR SELECT USING (true);


--
-- Name: user_creative_roles User roles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "User roles are viewable by everyone" ON public.user_creative_roles FOR SELECT USING (true);


--
-- Name: projects Users can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK ((auth.uid() = created_by));


--
-- Name: swipes Users can create swipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create swipes" ON public.swipes FOR INSERT WITH CHECK ((auth.uid() = swiper_id));


--
-- Name: verification_requests Users can create verification requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create verification requests" ON public.verification_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: user_genres Users can manage their own genres; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own genres" ON public.user_genres USING ((auth.uid() = user_id));


--
-- Name: portfolio_items Users can manage their own portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own portfolio" ON public.portfolio_items USING ((auth.uid() = user_id));


--
-- Name: user_creative_roles Users can manage their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own roles" ON public.user_creative_roles USING ((auth.uid() = user_id));


--
-- Name: messages Users can send messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT WITH CHECK (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM (public.conversations c
     JOIN public.matches m ON ((c.match_id = m.id)))
  WHERE ((c.id = messages.conversation_id) AND ((m.user_id_1 = auth.uid()) OR (m.user_id_2 = auth.uid())))))));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.user_notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: messages Users can view messages in their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.conversations c
     JOIN public.matches m ON ((c.match_id = m.id)))
  WHERE ((c.id = messages.conversation_id) AND ((m.user_id_1 = auth.uid()) OR (m.user_id_2 = auth.uid()))))));


--
-- Name: conversations Users can view their conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their conversations" ON public.conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = conversations.match_id) AND ((m.user_id_1 = auth.uid()) OR (m.user_id_2 = auth.uid()))))));


--
-- Name: matches Users can view their own matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own matches" ON public.matches FOR SELECT USING (((auth.uid() = user_id_1) OR (auth.uid() = user_id_2)));


--
-- Name: user_notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.user_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_sessions Users can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: swipes Users can view their own swipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own swipes" ON public.swipes FOR SELECT USING ((auth.uid() = swiper_id));


--
-- Name: verification_requests Users can view their own verification requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own verification requests" ON public.verification_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: featured_creatives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.featured_creatives ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: revenue_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.revenue_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: swipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

--
-- Name: user_creative_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_creative_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_genres; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_genres ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_suspensions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;