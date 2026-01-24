-- ============================================
-- Financial Goals & Savings Tracker Migration
-- Created: 2026-01-24
-- ============================================

-- 1. Create goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    current_amount NUMERIC(12, 2) DEFAULT 0 CHECK (current_amount >= 0),
    target_date DATE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    goal_type TEXT NOT NULL DEFAULT 'savings' CHECK (goal_type IN ('savings', 'debt_payoff', 'investment', 'purchase')),
    priority INTEGER DEFAULT 2 CHECK (priority IN (1, 2, 3)),
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create goal_contributions table
CREATE TABLE IF NOT EXISTS goal_contributions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount != 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create goal_milestones table
CREATE TABLE IF NOT EXISTS goal_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
    target_date DATE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_active_completed ON goals(user_id, is_active, is_completed);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_goal_id ON goal_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_date ON goal_contributions(user_id, contribution_date DESC);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id, order_index);

-- 5. Enable Row Level Security
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for goals
DROP POLICY IF EXISTS "Users can manage their own goals" ON goals;
CREATE POLICY "Users can manage their own goals"
    ON goals
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 7. RLS Policies for goal_contributions
DROP POLICY IF EXISTS "Users can manage their own contributions" ON goal_contributions;
CREATE POLICY "Users can manage their own contributions"
    ON goal_contributions
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 8. RLS Policies for goal_milestones
DROP POLICY IF EXISTS "Users can manage milestones of their goals" ON goal_milestones;
CREATE POLICY "Users can manage milestones of their goals"
    ON goal_milestones
    USING (EXISTS (
        SELECT 1 FROM goals WHERE goals.id = goal_milestones.goal_id AND goals.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM goals WHERE goals.id = goal_milestones.goal_id AND goals.user_id = auth.uid()
    ));

-- 9. Function to update goal amounts and completion status
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE goals 
        SET current_amount = current_amount + NEW.amount,
            is_completed = (current_amount + NEW.amount >= target_amount),
            completed_at = CASE 
                WHEN current_amount + NEW.amount >= target_amount AND is_completed = false THEN NOW()
                ELSE completed_at
            END,
            updated_at = NOW()
        WHERE id = NEW.goal_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE goals 
        SET current_amount = current_amount - OLD.amount + NEW.amount,
            is_completed = (current_amount - OLD.amount + NEW.amount >= target_amount),
            completed_at = CASE 
                WHEN current_amount - OLD.amount + NEW.amount >= target_amount AND is_completed = false THEN NOW()
                WHEN current_amount - OLD.amount + NEW.amount < target_amount THEN NULL
                ELSE completed_at
            END,
            updated_at = NOW()
        WHERE id = NEW.goal_id;
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE goals 
        SET current_amount = current_amount - OLD.amount,
            is_completed = (current_amount - OLD.amount >= target_amount),
            completed_at = CASE 
                WHEN current_amount - OLD.amount < target_amount THEN NULL
                ELSE completed_at
            END,
            updated_at = NOW()
        WHERE id = OLD.goal_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger for contribution changes
DROP TRIGGER IF EXISTS trigger_update_goal_amount ON goal_contributions;
CREATE TRIGGER trigger_update_goal_amount
    AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_current_amount();

-- 11. Function to auto-complete milestones
CREATE OR REPLACE FUNCTION check_milestone_completion()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE goal_milestones
    SET is_completed = true,
        completed_at = NOW()
    WHERE goal_id = NEW.id
      AND target_amount <= NEW.current_amount
      AND is_completed = false;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Trigger for milestone auto-completion
DROP TRIGGER IF EXISTS trigger_check_milestones ON goals;
CREATE TRIGGER trigger_check_milestones
    AFTER UPDATE OF current_amount ON goals
    FOR EACH ROW
    WHEN (NEW.current_amount > OLD.current_amount)
    EXECUTE FUNCTION check_milestone_completion();

-- 13. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON goal_contributions TO authenticated;
GRANT ALL ON goal_milestones TO authenticated;
