-- ==============================================================================
-- СТРОЙCRM — ПОЛНЫЙ СКРИПТ МИГРАЦИИ SUPABASE (POSTGRESQL)
-- 
-- Инструкция:
-- 1. Зайдите в проект на https://supabase.com
-- 2. Откройте в левом меню SQL Editor
-- 3. Создайте New Query, вставьте этот файл полностью и нажмите RUN
-- 4. В Authentication -> Providers -> Email отключите "Enable Sign Up" (публичная регистрация)
-- 5. Скопируйте Project URL и Anon Key в CRM (кнопка в шапке сайта)
-- ==============================================================================

-- 1. ТИПЫ ДАННЫХ (ENUMS)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('director', 'executor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('new', 'in_progress', 'under_review', 'accepted', 'rework');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. ТАБЛИЦА ПРОФИЛЕЙ (PROFILES)
-- Связана с auth.users из Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'executor',
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. ТАБЛИЦА ОБЪЕКТОВ СТРОИТЕЛЬСТВА (OBJECTS)
CREATE TABLE IF NOT EXISTS public.objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ТАБЛИЦА ЗАДАЧ (TASKS)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    object_id UUID NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
    executor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status task_status NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tasks_object_id ON public.tasks(object_id);
CREATE INDEX IF NOT EXISTS idx_tasks_executor_id ON public.tasks(executor_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- 5. ТАБЛИЦА ИСТОРИИ ИЗМЕНЕНИЙ (TASK_HISTORY)
-- Неизменяемый журнал аудита (Append-Only)
CREATE TABLE IF NOT EXISTS public.task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    old_status task_status,
    new_status task_status NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON public.task_history(task_id);

-- 6. ФУНКЦИЯ ДЛЯ ПРОВЕРКИ РОЛИ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 7. ТРИГГЕР ЖИЗНЕННОГО ЦИКЛА СТАТУСОВ (STATE MACHINE VALIDATION)
-- Защищает от недопустимых переходов даже при прямых API-запросах!
CREATE OR REPLACE FUNCTION public.validate_task_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role user_role;
    v_current_user_id UUID;
BEGIN
    IF OLD.status = NEW.status THEN
        NEW.updated_at = timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    v_current_user_id := auth.uid();
    
    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = v_current_user_id;

    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Пользователь не найден или не авторизован (ID: %)', v_current_user_id;
    END IF;

    -- ПРОВЕРКА ДЛЯ ИСПОЛНИТЕЛЯ
    IF v_user_role = 'executor' THEN
        IF OLD.executor_id != v_current_user_id THEN
            RAISE EXCEPTION 'Запрещено: вы не являетесь назначенным исполнителем этой задачи';
        END IF;

        -- Разрешенные переходы для исполнителя:
        -- 1. new -> in_progress
        -- 2. in_progress -> under_review
        -- 3. rework -> in_progress
        IF (OLD.status = 'new' AND NEW.status = 'in_progress') OR
           (OLD.status = 'in_progress' AND NEW.status = 'under_review') OR
           (OLD.status = 'rework' AND NEW.status = 'in_progress') THEN
            NULL;
        ELSE
            RAISE EXCEPTION 'Недопустимый переход статуса для исполнителя: "%" -> "%"', OLD.status, NEW.status;
        END IF;

        IF OLD.title != NEW.title OR OLD.description != NEW.description OR OLD.object_id != NEW.object_id OR OLD.executor_id != NEW.executor_id THEN
            RAISE EXCEPTION 'Исполнитель может обновлять только статус задачи';
        END IF;

    -- ПРОВЕРКА ДЛЯ РУКОВОДИТЕЛЯ
    ELSIF v_user_role = 'director' THEN
        -- Разрешенные переходы статуса для руководителя:
        -- 1. under_review -> accepted (Принята)
        -- 2. under_review -> rework (На доработке)
        IF (OLD.status = 'under_review' AND NEW.status = 'accepted') OR
           (OLD.status = 'under_review' AND NEW.status = 'rework') THEN
            NULL;
        ELSE
            RAISE EXCEPTION 'Недопустимый переход статуса для руководителя: "%" -> "%"', OLD.status, NEW.status;
        END IF;
    ELSE
        RAISE EXCEPTION 'Неизвестная роль пользователя: %', v_user_role;
    END IF;

    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_task_status_transition ON public.tasks;
CREATE TRIGGER trg_validate_task_status_transition
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_task_status_transition();

-- 8. БЕЗОПАСНАЯ RPC ФУНКЦИЯ ДЛЯ СМЕНЫ СТАТУСА И ЗАПИСИ В ИСТОРИЮ
CREATE OR REPLACE FUNCTION public.change_task_status(
    p_task_id UUID,
    p_new_status task_status,
    p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_task public.tasks%ROWTYPE;
    v_old_status task_status;
    v_user_id UUID;
    v_user_role user_role;
    v_history_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Необходима авторизация';
    END IF;

    SELECT * INTO v_task
    FROM public.tasks
    WHERE id = p_task_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Задача не найдена';
    END IF;

    v_old_status := v_task.status;

    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_old_status = 'under_review' AND p_new_status = 'rework' THEN
        IF p_comment IS NULL OR trim(p_comment) = '' THEN
            RAISE EXCEPTION 'Для возврата задачи на доработку обязателен комментарий с указанием замечаний';
        END IF;
    END IF;

    UPDATE public.tasks
    SET status = p_new_status,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_task_id;

    INSERT INTO public.task_history (task_id, user_id, old_status, new_status, comment)
    VALUES (p_task_id, v_user_id, v_old_status, p_new_status, trim(p_comment))
    RETURNING id INTO v_history_id;

    RETURN jsonb_build_object(
        'success', true,
        'task_id', p_task_id,
        'old_status', v_old_status,
        'new_status', p_new_status,
        'history_id', v_history_id
    );
END;
$$;

-- 9. ТРИГГЕР ДЛЯ ЛОГИРОВАНИЯ НАЧАЛЬНОГО СОЗДАНИЯ ЗАДАЧИ
CREATE OR REPLACE FUNCTION public.log_initial_task_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.task_history (task_id, user_id, old_status, new_status, comment)
    VALUES (NEW.id, NEW.author_id, NULL, NEW.status, 'Задача создана');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_initial_task_creation ON public.tasks;
CREATE TRIGGER trg_log_initial_task_creation
    AFTER INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.log_initial_task_creation();

-- 10. ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- 10.1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 10.2. OBJECTS
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Objects viewable by authenticated users" ON public.objects;
CREATE POLICY "Objects viewable by authenticated users"
    ON public.objects FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Director can insert objects" ON public.objects;
CREATE POLICY "Director can insert objects"
    ON public.objects FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'director');

DROP POLICY IF EXISTS "Director can update objects" ON public.objects;
CREATE POLICY "Director can update objects"
    ON public.objects FOR UPDATE
    TO authenticated
    USING (public.get_current_user_role() = 'director');

DROP POLICY IF EXISTS "Director can delete objects" ON public.objects;
CREATE POLICY "Director can delete objects"
    ON public.objects FOR DELETE
    TO authenticated
    USING (public.get_current_user_role() = 'director');

-- 10.3. TASKS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Руководитель видит ВСЕ задачи. Исполнитель видит ТОЛЬКО свои задачи!
DROP POLICY IF EXISTS "Tasks visibility policy" ON public.tasks;
CREATE POLICY "Tasks visibility policy"
    ON public.tasks FOR SELECT
    TO authenticated
    USING (
        public.get_current_user_role() = 'director' OR
        executor_id = auth.uid()
    );

DROP POLICY IF EXISTS "Director can insert tasks" ON public.tasks;
CREATE POLICY "Director can insert tasks"
    ON public.tasks FOR INSERT
    TO authenticated
    WITH CHECK (public.get_current_user_role() = 'director');

DROP POLICY IF EXISTS "Tasks update policy" ON public.tasks;
CREATE POLICY "Tasks update policy"
    ON public.tasks FOR UPDATE
    TO authenticated
    USING (
        public.get_current_user_role() = 'director' OR
        executor_id = auth.uid()
    );

DROP POLICY IF EXISTS "Director can delete tasks" ON public.tasks;
CREATE POLICY "Director can delete tasks"
    ON public.tasks FOR DELETE
    TO authenticated
    USING (public.get_current_user_role() = 'director');

-- 10.4. TASK_HISTORY
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "History select policy" ON public.task_history;
CREATE POLICY "History select policy"
    ON public.task_history FOR SELECT
    TO authenticated
    USING (
        public.get_current_user_role() = 'director' OR
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_history.task_id AND t.executor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "History insert policy" ON public.task_history;
CREATE POLICY "History insert policy"
    ON public.task_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ЗАПРЕТ НА РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ ИСТОРИИ! (UPDATE / DELETE отсутствуют)

-- 11. АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ AUTH.USERS -> PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'executor'),
        NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
