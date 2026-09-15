package com.zhang.enterprisepilotjava.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.zhang.enterprisepilotjava.user.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface UserMapper extends BaseMapper<User> {

    @Select("""
            select r.role_code
            from sys_user_role ur
            join sys_role r on r.id = ur.role_id
            where ur.user_id = #{userId} and r.status = 1
            """)
    List<String> selectRoleCodesByUserId(@Param("userId") Long userId);
}
